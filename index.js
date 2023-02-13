import { Ed25519Keypair, JsonRpcProvider, RawSigner } from '@mysten/sui.js';
import fs from 'fs';
import consoleStamp from 'console-stamp';
import { accessories } from './accessories.js';
import BigNumber from "bignumber.js";

consoleStamp(console, { format: ':date(HH:MM:ss)' });
const timeout = ms => new Promise(res => setTimeout(res, ms));
const provider = new JsonRpcProvider('https://fullnode.testnet.sui.io');
const parseFile = fileName => fs.readFileSync(fileName, "utf8").split('\n').map(str => str.trim()).filter(str => str.length > 10);
const generateRandomAmount = (min, max) => Math.random() * (max - min) + min;
const availableAccessories = accessories.filter(item => !item.name.includes('holiday'))
const getRandomAccessory = () => availableAccessories[Math.floor(Math.random() * availableAccessories.length)]


const contracts = {
    VITE_PACKAGE_ID: "0x4c10b61966a34d3bb5c8a8f063e6b7445fc41f93",
    VITE_VERSION: "1",
    VITE_DIGEST: "vCqaAEMMPRKEszkjRw3oe1AvcxVLt2gv7CGtGpm2jvE=",
    VITE_REGISTRY: "0x2e09e52d1027d2cb3d1bd2edbd95d1a093d6a886",
    VITE_REGISTRY_V: "159537",
    VITE_CAPY_MARKET: "0x3bc2b201b054704a90043ca03d3ed897180959d0",
    VITE_CAPY_MARKET_V: "159537",
    VITE_ITEM_STORE: "0x3a60ac6f596443c94091555d622ed404fe2a6afb",
    VITE_ITEM_STORE_V: "159537",
    VITE_EDEN: "0xabe47e555dd47dd38ce239f22d5208277cf0d57e",
    VITE_EDEN_V: "159537",
    VITE_API_URL: "https://api.testnet.capy.art",
    VITE_SUI_NETWORK: "testnet",
    VITE_USER_NODE_ENV: "testnet",
    BASE_URL: "/",
    MODE: "production",
    DEV: !1,
    PROD: !0
}

const nftArray = [
    [
        'Example NFT',
        'An NFT created by Sui Wallet',
        'ipfs://QmZPWWy5Si54R3d26toaqRiqvCH7HkGdXkxwUgCm2oKKM2?filename=img-sq-01.png',
    ], [
        'Wizard Land',
        'Expanding The Magic Land',
        'https://gateway.pinata.cloud/ipfs/QmYfw8RbtdjPAF3LrC6S3wGVwWgn6QKq4LGS4HFS55adU2?w=800&h=450&c=crop',
    ], [
        'Ethos 2048 Game',
        'This player has unlocked the 2048 tile on Ethos 2048. They are a Winner!',
        'https://arweave.net/QW9doLmmWdQ-7t8GZ85HtY8yzutoir8lGEJP9zOPQqA',
    ], [
        "Sui Test Ecosystem",
        "Get ready for the Suinami 🌊",
        "ipfs://QmVnWhM2qYr9JkjGLaEVSZnCprRLDW8qns1oYYVXjnb4DA/sui.jpg"
    ], [
        "Skull Sui",
        "Skulls are emerging from the ground!",
        "https://gateway.pinata.cloud/ipfs/QmcsJtucGrzkup9cZp2N8vvTc9zxuQtV85z3g2Rs4YRLGX"
    ]
];


async function mintNft(signer, args) {
    console.log(`Minting: ${args[1]}`);

    return await signer.executeMoveCall({
        packageObjectId: '0x2',
        module: 'devnet_nft',
        function: 'mint',
        typeArguments: [],
        arguments: args,
        gasBudget: 10000,
    })
}

async function mintCapy(signer) {
    console.log(`Minting Capy`);

    let data = await signer.executeMoveCall({
        packageObjectId: contracts.VITE_PACKAGE_ID,
        module: 'eden',
        function: 'get_capy',
        typeArguments: [],
        arguments: [contracts.VITE_EDEN, contracts.VITE_REGISTRY],
        gasBudget: 10000
    })
    await timeout(4000)

    if (data) return data.EffectsCert.effects.effects.events.find(i => i.moveEvent).moveEvent.fields.id;
}

async function getAccountBalances(address) {
    let data = await provider.getCoinBalancesOwnedByAddress(address)
    let arr = data.map(obj => ({
        address: obj.details.reference.objectId,
        type: obj.details.data.type,
        balance: obj.details.data.fields.balance
    }))

    return arr.filter(coin => coin.type.includes("coin::Coin<0x2::sui::SUI>")).sort((a, b) => b.balance - a.balance)
}

async function getAddressesByPrice(signer, price) {
    let address = await signer.getAddress()
    let balances = await getAccountBalances(address)
    let balanceSum = 0;
    let array = [];

    for (let balance of balances) {
        if (balanceSum < price) {
            array.push(balance.address)
            balanceSum += +balance.balance
        }
    }

    return array
}

async function buyRandonAccessory(signer) {
    const randomAccessory = getRandomAccessory();
    const { name, price } = randomAccessory
    console.log(`Buying accessory ${name}`);

    let coinAddress = await getAddressesByPrice(signer, price);

    let data = await signer.executeMoveCall({
        packageObjectId: contracts.VITE_PACKAGE_ID,
        module: 'capy_item',
        function: 'buy_mul_coin',
        typeArguments: [],
        arguments: [contracts.VITE_ITEM_STORE, name, coinAddress],
        gasBudget: 10000
    })
    await timeout(3000)

    if (data) return data.EffectsCert.effects.effects.events.find(i => i.moveEvent).moveEvent.fields.id;
}

async function addAccessoryToCapy(signer, capyId, accessoryId) {
    console.log(`Adding accessory to Capy`);

    await signer.executeMoveCall({
        packageObjectId: contracts.VITE_PACKAGE_ID,
        module: 'capy',
        function: 'add_item',
        typeArguments: [`${contracts.VITE_PACKAGE_ID}::capy_item::CapyItem`],
        arguments: [capyId, accessoryId],
        gasBudget: 10000
    })

    await timeout(3000)
}

async function breedCapys(signer, firstCapy, secondCapy) {
    console.log(`Breeding capys`);

    let data = await signer.executeMoveCall({
        packageObjectId: contracts.VITE_PACKAGE_ID,
        module: 'capy',
        function: 'breed_and_keep',
        typeArguments: [],
        arguments: [contracts.VITE_REGISTRY, firstCapy, secondCapy],
        gasBudget: 10000
    })

    if (data) return data.EffectsCert.effects.effects.events.find(i => i.moveEvent).moveEvent.fields.id;
}

async function sellCapy(signer, capyId) {
    let price = (generateRandomAmount(0.01, 0.09).toFixed(2));
    console.log(`Listing new Capy for ${price} SUI`);

    let n = price * 1000000000;
    let bn = BigNumber(n)

    return await signer.executeMoveCall({
        packageObjectId: contracts.VITE_PACKAGE_ID,
        module: 'capy_market',
        function: 'list',
        typeArguments: [`${contracts.VITE_PACKAGE_ID}::capy::Capy`],
        arguments: [contracts.VITE_CAPY_MARKET, capyId, bn],
        gasBudget: 10000
    })
}

async function handleCapy(signer) {
    let capyId = await mintCapy(signer);
    let accessoryId = await buyRandonAccessory(signer)
    await addAccessoryToCapy(signer, capyId, accessoryId)

    return capyId
}

async function getCapys(address) {
    let objects = await provider.getObjectsOwnedByAddress(address);
    return objects.filter(i => i.type.includes(`${contracts.VITE_PACKAGE_ID}::capy::Capy`))
}

async function handleNFTs(mnemonic) {
    try {
        const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
        const address = keypair.getPublicKey().toSuiAddress();
        const signer = new RawSigner(keypair, provider);
        const balance = await provider.getBalance(address);
        console.log(`Sui Address: 0x${address} balance: ${balance.totalBalance / 1000000000} SUI`)

        let capys = await getCapys(address)
        if (capys.length === 0) {
            let firstCapy = await handleCapy(signer)
            let secondCapy = await handleCapy(signer)
            let newCapy = await breedCapys(signer, firstCapy, secondCapy)
            await sellCapy(signer, newCapy)
        } else console.log(`Capys are already minted on this wallet`);

        for (let i = 0; i < nftArray.length; i++) {
            await mintNft(signer, nftArray[i])
        }

        console.log(`https://explorer.sui.io/address/${address}?network=testnet`);
        console.log("-".repeat(100));
    } catch (err) { console.log(err.message) }
}


(async () => {
    let mnemonics = parseFile('wallets.txt');
    console.log(`Loaded ${mnemonics.length} wallets`);

    for (let i = 0; i < mnemonics.length; i++) {
        await handleNFTs(mnemonics[i])
    }
})()