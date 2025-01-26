"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swap = swap;
/*

Most of the Meme Coin are not listed on exchanges so what we will do is we sill swap in chain
In order to swap it will spam the blockchain with bunch of transactions
This swaping will be done on Raydium (RAY) which is a decentralized exchange (DEX) and automated market maker (AMM)
Here main thing is we have to set how much sol we will trade in exchange of how much meme coin.
IT IS MUST TO SET HOW MUCH MEME COIN WE WANT OTHEREWISE THERE IS A CHANCE OF GETTING SANDWICHED IN WHICH WE MIGHT ASLO HET 0 MEME COIN.
WE set slippage tolerance of 5% which means if I get 5% less of meme coin in exchange that is fine but not more than that.

*/
const bs58_1 = __importDefault(require("bs58")); // Base 58 encryption
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const axios_1 = __importDefault(require("axios"));
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
const isV0Tx = true;
const connection = new web3_js_1.Connection(process.env.RPC_URL); // Alchemy RPC - SOLANA
// Our Wallet Private Key can not be directly used so we have to convert string into bunch of bytes using base 58 encryption
const owner = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.PRIVATE_KEY));
const slippage = 5; // slippage tolerance
/*
Now how things work-
1. We will send our desired swap trade to raydium
2. Then raydium will send us a quot
3. If its fall under my slippage range then I will tell raydium I am good with transaction proceed with it
4. Raydium will return the transaction which I will sign with my private key and forward to RPC blockchain.
*/
function swap(tokenAddress, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield axios_1.default.get(`${raydium_sdk_v2_1.API_URLS.BASE_HOST}${raydium_sdk_v2_1.API_URLS.PRIORITY_FEE}`); // how much extra you want to pay to land the transaction
        const { data: swapResponse } = yield axios_1.default.get(`${raydium_sdk_v2_1.API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${spl_token_1.NATIVE_MINT}&outputMint=${tokenAddress}&amount=${amount}&slippageBps=${ //MINT is the address that can create more token
        slippage * 100}&txVersion=V0` // Swap reaponse quot response
        );
        const { data: swapTransactions } = yield axios_1.default.post(`${raydium_sdk_v2_1.API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
            computeUnitPriceMicroLamports: String(data.data.default.h),
            swapResponse,
            txVersion: 'V0',
            wallet: owner.publicKey.toBase58(),
            wrapSol: true,
            unwrapSol: false, // will get swap transaction
        });
        const ata = yield (0, spl_token_1.getAssociatedTokenAddress)(new web3_js_1.PublicKey(tokenAddress), owner.publicKey);
        console.log({
            computeUnitPriceMicroLamports: String(data.data.default.h),
            swapResponse,
            txVersion: 'V0',
            wallet: owner.publicKey.toBase58(),
            wrapSol: true,
            unwrapSol: false,
            // outputMint: ata.toBase58()
        });
        console.log(swapTransactions);
        const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
        const allTransactions = allTxBuf.map((txBuf) => isV0Tx ? web3_js_1.VersionedTransaction.deserialize(txBuf) : web3_js_1.Transaction.from(txBuf));
        let idx = 0;
        for (const tx of allTransactions) {
            idx++;
            const transaction = tx;
            transaction.sign([owner]); // Sign transaction using private key
            const txId = yield connection.sendTransaction(tx, { skipPreflight: true }); // Sending transaction to block chainvsix
            console.log("after sending txn");
            const { lastValidBlockHeight, blockhash } = yield connection.getLatestBlockhash({
                commitment: 'finalized',
            });
            console.log(`${idx} transaction sending..., txId: ${txId}`);
            yield connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature: txId,
            }, 'confirmed');
            console.log(`${idx} transaction confirmed`);
        }
    });
}
