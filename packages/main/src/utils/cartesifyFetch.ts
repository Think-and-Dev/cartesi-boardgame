import { Cartesify, FetchOptions, Response, FetchFun } from "@calindra/cartesify";
import { Semaphore } from "./semaphore";
import { Signer } from "ethers";

export class CartesifyFetch {
    private isPostInProgress = false;
    private pendingFetches: (() => Promise<void>)[] = [];
    private fetchSemaphore: Semaphore;
    private postsSemaphore: Semaphore;
    cartesifyFetch: FetchFun;

    constructor(opts: {
        dappAddress: string;
        nodeUrl: string;
        signer?: Signer;
    }) {

        if (opts.nodeUrl.slice(-1) !== '/') {
            opts.nodeUrl += '/';
        }
        this.cartesifyFetch = Cartesify.createFetch({
            dappAddress: opts.dappAddress,
            endpoints: {
                graphQL: new URL(`${opts.nodeUrl}graphql`),
                inspect: new URL(`${opts.nodeUrl}inspect`),
            },
            provider: opts.signer?.provider,
            signer: opts.signer,
        });

        this.postsSemaphore = new Semaphore('posts', 1);
        this.fetchSemaphore = new Semaphore('fetches', 1);
    }

    async doFetch(url: string | URL | Request, options?: FetchOptions): Promise<Response> {
        if (options?.method === 'POST') {
            // For POSTs, first we acquire the fetchs semaphore to update isPostInProgress
            const fetchLock = await this.fetchSemaphore.acquire();
            this.isPostInProgress = true;
            fetchLock.release();

            // Then we acquire the posts semaphore for the operation
            const postLock = await this.postsSemaphore.acquire();
            try {
                return await this.cartesifyFetch(url, options);
            } catch (error) {
                console.error('Error in POST', error);
                throw error;
            } finally {
                // When the POST is finished, we process the pending fetches, update isPostInProgress and release the semaphores
                await this.processPendingFetches();
                this.isPostInProgress = false;
                postLock.release();
            }
        } else {
            // For GETs, we check if there is a POST in progress
            const fetchLock = await this.fetchSemaphore.acquire();
            try {
                if (this.isPostInProgress) {
                    // If there is a POST in progress, we put the GET in queue
                    return new Promise((resolve) => {
                        this.pendingFetches.push(async () => {
                            const response = await this.cartesifyFetch(url, options);
                            resolve(response);
                        });
                    });
                }
            } finally {
                fetchLock.release();
            }

            // We execute the GET
            return await this.cartesifyFetch(url, options);
        }
    }

    private async processPendingFetches() {
        while (this.pendingFetches.length > 0) {
            const fetch = this.pendingFetches.shift();
            if (fetch) {
                await fetch();
            }
        }
    }
}