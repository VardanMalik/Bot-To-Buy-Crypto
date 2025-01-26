/*

Most of the Meme Coin are not listed on exchanges so what we will do is we sill swap in chain
In order to swap it will spam the blockchain with bunch of transactions
This swaping will be done on Raydium (RAY) which is a decentralized exchange (DEX) and automated market maker (AMM)
Here main thing is we have to set how much sol we will trade in exchange of how much meme coin. 
IT IS MUST TO SET HOW MUCH MEME COIN WE WANT OTHEREWISE THERE IS A CHANCE OF GETTING SANDWICHED IN WHICH WE MIGHT ASLO HET 0 MEME COIN.
WE set slippage tolerance of 5% which means if I get 5% less of meme coin in exchange that is fine but not more than that.

*/
import bs58 from "bs58"; // Base 58 encryption
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { NATIVE_MINT, getAssociatedTokenAddress } from '@solana/spl-token'
import axios from 'axios'
import { API_URLS } from '@raydium-io/raydium-sdk-v2'
const isV0Tx = true;
const connection = new Connection(process.env.RPC_URL!);  // Alchemy RPC - SOLANA

// Our Wallet Private Key can not be directly used so we have to convert string into bunch of bytes using base 58 encryption
const owner = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

const slippage = 5;   // slippage tolerance
/*
Now how things work-
1. We will send our desired swap trade to raydium
2. Then raydium will send us a quot 
3. If its fall under my slippage range then I will tell raydium I am good with transaction proceed with it
4. Raydium will return the transaction which I will sign with my private key and forward to RPC blockchain. 
*/
export async function swap(tokenAddress: string, amount: number) {
 
    const { data } = await axios.get<{
        id: string
        success: boolean
        data: { default: { vh: number; h: number; m: number } }
      }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);    // how much extra you want to pay to land the transaction

    const { data: swapResponse } = await axios.get(
        `${
          API_URLS.SWAP_HOST
        }/compute/swap-base-in?inputMint=${NATIVE_MINT}&outputMint=${tokenAddress}&amount=${amount}&slippageBps=${  //MINT is the address that can create more token
          slippage * 100}&txVersion=V0`    // Swap reaponse quot response
    );

    const { data: swapTransactions } = await axios.post<{
        id: string
        version: string
        success: boolean
        data: { transaction: string }[]
      }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion: 'V0',
        wallet: owner.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false,  // will get swap transaction
    })

    const ata = await getAssociatedTokenAddress(new PublicKey(tokenAddress), owner.publicKey);

    console.log({
        computeUnitPriceMicroLamports: String(data.data.default.h),
        swapResponse,
        txVersion: 'V0',
        wallet: owner.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false,
        // outputMint: ata.toBase58()
    })
    console.log(swapTransactions)
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'))
    const allTransactions = allTxBuf.map((txBuf) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    )

    let idx = 0
    for (const tx of allTransactions) {
        idx++
        const transaction = tx as VersionedTransaction
        transaction.sign([owner])       // Sign transaction using private key

        const txId = await connection.sendTransaction(tx as VersionedTransaction, { skipPreflight: true })   // Sending transaction to block chainvsix
        console.log("after sending txn");    
        const { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash({
          commitment: 'finalized',
        })
        console.log(`${idx} transaction sending..., txId: ${txId}`)
        await connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: txId,
          },
          'confirmed'
        )
        console.log(`${idx} transaction confirmed`)
    }

}