require('dotenv').config();

const Web3 = require('web3');  // Ensure this is correctly imported
const { ethers } = require('ethers');
const { Fetcher, Route, Trade, TokenAmount, TradeType } = require('@uniswap/sdk');

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
const wallet = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const uniswapRouterABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "amountIn",
                "type": "uint256"
            },
            {
                "name": "amountOutMin",
                "type": "uint256"
            },
            {
                "name": "path",
                "type": "address[]"
            },
            {
                "name": "to",
                "type": "address"
            },
            {
                "name": "deadline",
                "type": "uint256"
            }
        ],
        "name": "swapExactTokensForETH",
        "outputs": [
            {
                "name": "amounts",
                "type": "uint256[]"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const uniswapRouterAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

async function swapTokensForETH(tokenAddress, amountIn, slippageTolerance, recipient) {
    try {
        // Fetch token and WETH data
        const token = await Fetcher.fetchTokenData(1, tokenAddress, web3);
        const weth = await Fetcher.fetchTokenData(1, ethers.constants.AddressZero, web3);

        // Fetch pair data
        const pair = await Fetcher.fetchPairData(token, weth, web3);

        // Create a route with the pair
        const route = new Route([pair], token);

        // Create a trade with the route and amountIn
        const trade = new Trade(route, new TokenAmount(token, ethers.utils.parseUnits(amountIn.toString(), 18)), TradeType.EXACT_INPUT);

        // Calculate the minimum amount out with slippage tolerance
        const slippageTolerancePercentage = new ethers.BigNumber.from((slippageTolerance * 100).toString());
        const amountOutMin = trade.minimumAmountOut(slippageTolerancePercentage).raw;

        // Set the path, recipient, and deadline
        const path = [token.address, weth.address];
        const to = recipient;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Create a Uniswap router contract instance
        const uniswapRouter = new web3.eth.Contract(uniswapRouterABI, uniswapRouterAddress);

        // Create a transaction to swap tokens for ETH
        const tx = uniswapRouter.methods.swapExactTokensForETH(
            ethers.utils.parseUnits(amountIn.toString(), 18),
            amountOutMin.toString(),
            path,
            to,
            deadline
        );

        // Estimate gas for the transaction
        const gasEstimate = await tx.estimateGas({ from: wallet.address });

        // Send the transaction with the estimated gas
        const txReceipt = await tx.send({
            from: wallet.address,
            gas: gasEstimate,
        });

        console.log('Transaction receipt:', txReceipt);
    } catch (error) {
        console.error('Error swapping tokens for ETH:', error);
    }
}

// Example usage
swapTokensForETH(
    '0xYourTokenAddressHere',
    1,
    0.5,
    '0xYourWalletAddressHere'
);