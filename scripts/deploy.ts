import { ethers, network } from "hardhat";
import hre from "hardhat";
import fs from "fs";

async function verifyContract(address: string, constructorArguments: any[] = []) {
  if (network.name === "hardhat" || network.name === "localhost") return;

  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for Base Sepolia

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
    });
    console.log(`Contract verified at ${address}`);
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.error("Error verifying contract:", error);
    }
  }
}

async function main() {
  try {
    console.log("Starting deployment process...");

    // Deploy TestToken
    console.log("\nDeploying TestToken...");
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy(
      "Test Token",
      "TEST",
      ethers.parseEther("1000000") // 1 million tokens
    );
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    console.log(`TestToken deployed to: ${testTokenAddress}`);

    // Deploy ReverseDutchAuctionSwap
    console.log("\nDeploying ReverseDutchAuctionSwap...");
    const ReverseDutchAuctionSwap = await ethers.getContractFactory("ReverseDutchAuctionSwap");
    const auctionSwap = await ReverseDutchAuctionSwap.deploy();
    await auctionSwap.waitForDeployment();
    const auctionSwapAddress = await auctionSwap.getAddress();
    console.log(`ReverseDutchAuctionSwap deployed to: ${auctionSwapAddress}`);

    // Log all deployed addresses
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log(`Network: ${network.name}`);
    console.log(`TestToken: ${testTokenAddress}`);
    console.log(`ReverseDutchAuctionSwap: ${auctionSwapAddress}`);

    // Save deployment addresses
    const deployments = {
      network: network.name,
      testToken: testTokenAddress,
      auction: auctionSwapAddress,
      timestamp: new Date().toISOString()
    };

    const deploymentsDir = "./deployments";
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    fs.writeFileSync(
      `${deploymentsDir}/${network.name}.json`,
      JSON.stringify(deployments, null, 2)
    );

    // Start verification process
    if (network.name !== "hardhat" && network.name !== "localhost") {
      console.log("\nStarting contract verification...");

      // Verify TestToken
      await verifyContract(testTokenAddress, [
        "Test Token",
        "TEST",
        ethers.parseEther("1000000")
      ]);

      // Verify ReverseDutchAuctionSwap
      await verifyContract(auctionSwapAddress, []);
    }

    console.log("\nDeployment completed successfully!");
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  }
}

// Execute deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});