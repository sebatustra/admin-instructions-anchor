import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AdminInstructions } from "../target/types/admin_instructions";
import { assert, expect } from "chai";
import * as spl from "@solana/spl-token";
import fs from "fs";
import { execSync } from "child_process"

describe("admin-instructions", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const connection = provider.connection;
  const program = anchor.workspace.AdminInstructions as Program<AdminInstructions>;

  const wallet = anchor.workspace.AdminInstructions.provider.wallet;

  const sender = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();

  const programConfig = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("program_config")],
    program.programId
  )[0];

  const programDataAddress = anchor.web3.PublicKey.findProgramAddressSync(
    [program.programId.toBytes()],
    new anchor.web3.PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
  )[0]

  let feeDestination: anchor.web3.PublicKey;
  let senderTokenAccount: anchor.web3.PublicKey;
  let receiverTokenAccount: anchor.web3.PublicKey;

  before(async () => {

    let data = fs.readFileSync(
        "envurssTN9UhDJJeMZm3QxxGh2pYUhRZQ2eFWDGaoZm.json"
    )

    let keypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(data.toString()))
    )

    const mint = await spl.createMint(
        connection,
        wallet.payer,
        wallet.publicKey,
        null,
        0,
        keypair
    )

    feeDestination = await spl.createAccount(
        connection,
        wallet.payer,
        mint,
        wallet.publicKey
    );

    senderTokenAccount = await spl.createAccount(
        connection,
        wallet.payer,
        mint,
        sender.publicKey
    );

    receiverTokenAccount = await spl.createAccount(
        connection,
        wallet.payer,
        mint,
        receiver.publicKey
    );

    await spl.mintTo(
        connection,
        wallet.payer,
        mint,
        senderTokenAccount,
        wallet.payer,
        10000
    );

    const transactionSignature = await connection.requestAirdrop(
        sender.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
    );

    const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
        {
            blockhash,
            lastValidBlockHeight,
            signature: transactionSignature
        },
        "confirmed"
    );

  })

  it("Initializes Program Config Account", async () => {
    const tx = await program.methods
        .initializeProgramConfig()
        .accounts({
            programConfig,
            feeDestination,
            authority: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

    assert.strictEqual(
        (
            await program.account.programConfig.fetch(programConfig)
        ).feeBasisPoints.toNumber(),
        100
    )

    assert.strictEqual(
        (
            await program.account.programConfig.fetch(programConfig)
        ).admin.toString(),
        wallet.publicKey.toString()
    )
  })

  it("Payment completes succesfully", async () => {
    const tx = await program.methods.payment(new anchor.BN(10000))
        .accounts({
            programConfig,
            feeDestination,
            senderTokenAccount,
            receiverTokenAccount,
            sender: sender.publicKey
        })
        .transaction();

    await anchor.web3.sendAndConfirmTransaction(connection, tx, [sender]);

    assert.strictEqual(
        (await connection.getTokenAccountBalance(senderTokenAccount)).value
          .uiAmount,
        0
    )

    assert.strictEqual(
        (await connection.getTokenAccountBalance(feeDestination)).value.uiAmount,
        100
    );

    assert.strictEqual(
        (await connection.getTokenAccountBalance(receiverTokenAccount)).value.uiAmount,
        9900
    )

  })

  it("Update Program Config Account", async () => {
    const tx = await program.methods
        .updateProgramConfig(new anchor.BN(200))
        .accounts({
            programConfig,
            feeDestination,
            admin: wallet.publicKey,
            newAdmin: sender.publicKey
        })
        .rpc()

    assert.strictEqual(
        (
            await program.account.programConfig.fetch(programConfig)
        ).feeBasisPoints.toNumber(),
        200
    )
  })

  it("Update Program Config with unauthorized admin (expect fail)", async () => {
    try {
        const tx = await program.methods
            .updateProgramConfig(new anchor.BN(300))
            .accounts({
                programConfig,
                feeDestination,
                admin: sender.publicKey,
                newAdmin: sender.publicKey
            })
            .transaction();

        await anchor.web3.sendAndConfirmTransaction(connection, tx, [sender])
    } catch (error) {
        expect(error)
    }
  })
});
