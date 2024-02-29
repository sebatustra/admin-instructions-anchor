use anchor_lang::prelude::*;
use solana_program::pubkey;

mod instructions;
use instructions::*;

mod state;

declare_id!("AH3gT3xA632W86HaGKkuj9995aef3RNrd1jKgBp5NZej");


#[cfg(not(feature = "local-testing"))]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");


#[cfg(feature = "local-testing")]
#[constant]
pub const USDC_MINT_PUBKEY: Pubkey = pubkey!("envurssTN9UhDJJeMZm3QxxGh2pYUhRZQ2eFWDGaoZm");

pub const SEED_PROGRAM_CONFIG: &[u8] = b"program_config";

#[constant]
pub const ADMIN: Pubkey = pubkey!("FP1Leoo9QxiqTg5gfdKxovBSX3VpEDnRdZBgYZuf8Luk");

#[program]
pub mod admin_instructions {
    use super::*;

    pub fn payment(ctx: Context<Payment>, amount: u64) -> Result<()> {
        payment_handler(ctx, amount)
    }
    
    pub fn initialize_program_config(ctx: Context<InitializeProgramConfig>) -> Result<()> {
        instructions::initialize_program_config_handler(ctx)
    }

    pub fn update_program_config(
        ctx: Context<UpdateProgramConfig>,
        new_fee: u64
    ) -> Result<()> {
        instructions::update_program_config(ctx, new_fee)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
