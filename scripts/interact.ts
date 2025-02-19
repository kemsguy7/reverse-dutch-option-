import { ethers } from "hardhat";
import fs from "fs";

// Utility function to get deployed addresses
async function getDeployedAddresses() {
  const network = process.env.HARDHAT_NETWORK || "base_sepolia";
  const deploymentPath = `./deployments/${network}.json`;
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network ${network}`);
  }
  
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

async function createAuction() {
  try {
    // Get deployed contract addresses
    const { testToken: tokenAddress, auction: auctionAddress } = await getDeployedAddresses();
    console.log("Contract addresses:", {
      tokenAddress,
      auctionAddress
    });

    // Get contract instances
    const testToken = await ethers.getContractAt("TestToken", tokenAddress);
    const auction = await ethers.getContractAt("ReverseDutchAuctionSwap", auctionAddress);

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);

    // Auction parameters
    const tokenAmount = ethers.parseEther("100"); // 100 tokens
    const startPrice = ethers.parseEther("1");    // 1 ETH
    const endPrice = ethers.parseEther("0.1");    // 0.1 ETH
    const duration = 3600;                        // 1 hour

    // Check token balance
    const balance = await testToken.balanceOf(signer.address);
    console.log("Token balance:", ethers.formatEther(balance));

    // Approve auction contract
    console.log("\nApproving auction contract...");
    const approveTx = await testToken.approve(auctionAddress, tokenAmount);
    await approveTx.wait();
    console.log("Approval completed");

    // Create auction
    console.log("\nCreating auction...");
    const tx = await auction.createAuction(
      tokenAddress,
      tokenAmount,
      startPrice,
      endPrice,
      duration
    );
    const receipt = await tx.wait();
    console.log("Auction created! Transaction:", receipt?.hash);

    // Get current auction ID
    const auctionId = Number(await auction.getAuctionCount()) - 1;
    console.log("Auction ID:", auctionId);

    return { auctionId, testToken, auction };
  } catch (error) {
    console.error("Error in createAuction:", error);
    throw error;
  }
}

async function executeSwap(auctionId: number) {
  try {
    const { auction: auctionAddress } = await getDeployedAddresses();
    const auction = await ethers.getContractAt("ReverseDutchAuctionSwap", auctionAddress);
    
    const [signer] = await ethers.getSigners();
    console.log("Buyer address:", signer.address);

    // Get current price
    const currentPrice = await auction.getCurrentPrice(auctionId);
    console.log("\nCurrent price:", ethers.formatEther(currentPrice), "ETH");

    // Execute swap with ETH payment
    console.log("\nExecuting swap...");
    const tx = await auction.executeSwap(auctionId, {
      value: currentPrice
    });
    const receipt = await tx.wait();
    console.log("Swap executed! Transaction:", receipt?.hash);
  } catch (error) {
    console.error("Error in executeSwap:", error);
    throw error;
  }
}

async function checkPrice(auctionId: number) {
  try {
    const { auction: auctionAddress } = await getDeployedAddresses();
    const auction = await ethers.getContractAt("ReverseDutchAuctionSwap", auctionAddress);

    const currentPrice = await auction.getCurrentPrice(auctionId);
    console.log("\nCurrent auction price:", ethers.formatEther(currentPrice), "ETH");
    return currentPrice;
  } catch (error) {
    console.error("Error in checkPrice:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("Starting auction process...");
    
    // Create auction
    const { auctionId } = await createAuction();

    // Wait for some time to let price decrease
    console.log("\nWaiting for price to decrease...");
    await new Promise(r => setTimeout(r, 5000));

    // Check current price
    await checkPrice(auctionId);

    // Execute swap
    console.log("\nExecuting swap...");
    await executeSwap(auctionId);

  } catch (error) {
    console.error("Error in main:", error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}