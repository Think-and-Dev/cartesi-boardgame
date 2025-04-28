import { CartesifyBackend } from '@calindra/cartesify-backend';

async function runCartesifyDapp() {
    console.info('Cartesify Dapp starting. Env Rollup URL:', process.env.ROLLUP_HTTP_SERVER_URL);
    try {
        const initDapp = await CartesifyBackend.createDapp({
            url: process.env.ROLLUP_HTTP_SERVER_URL
        });
        console.info('Cartesify Dapp created, starting loop connected to Cartesi Rollup on ', (initDapp as any)?.options?.url);
        await initDapp.start();
    } catch (error) {
        console.error(`Dapp initialization failed: ${error}`);
        console.log(error);
        throw error;
    }
}

runCartesifyDapp();