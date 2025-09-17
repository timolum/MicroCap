# 🚀 MicroCap: Tokenized Micro-Investments for Startups

Welcome to MicroCap, the game-changing Web3 platform that democratizes startup investing! Empower small savers to own fractional shares in promising startups using the Stacks blockchain and Clarity smart contracts. Say goodbye to high barriers—invest as little as $10 and fuel innovation from your pocket.

## ✨ Features

💼 **Startup Onboarding**: Easy registration and verification for founders to launch campaigns  
📈 **Fractional Tokenization**: Break equity into micro-tokens for bite-sized investments  
🛡️ **Secure Escrow**: Funds locked until milestones are met, protecting investors  
🗳️ **Governance Voting**: Token holders vote on key startup decisions  
💰 **Dividend Payouts**: Automated distribution of profits to token holders  
🔍 **Compliance & KYC**: Built-in checks for regulatory adherence  
📊 **Investment Dashboard**: Real-time tracking of portfolios and returns  
🔄 **Secondary Marketplace**: Trade tokens peer-to-peer for liquidity  

## 🛠 How It Works

Powered by 8 Clarity smart contracts on Stacks for transparency, low fees, and Bitcoin finality. Here's the magic:

**For Startups (Founders)**

- Register your startup via the `StartupRegistry` contract: Submit pitch, team details, and funding goal
- Once admin-approved, issue fractional tokens using the `TokenIssuer` contract
- Hit milestones? Release escrowed funds from the `EscrowContract` and update via the `MilestoneOracle`
- Engage community: Use the `GovernanceVoting` contract for token-holder votes on pivots or expansions

Your campaign live—watch small investments pour in!

**For Investors (Small Savers)**

- Browse verified startups on the dashboard, powered by `InvestmentPool` queries
- Invest STX or sBTC via the `InvestmentPool` contract—get instant fractional tokens in return
- Monitor progress with `PortfolioTracker` reads; vote on proposals if you're a holder
- Claim dividends from the `DividendDistributor` when profits roll in, or trade on the `TokenMarketplace`
- All compliant: `KYCCompliance` ensures you're verified before investing

Boom! You're a startup shareholder. Track, vote, earn—effortlessly.
