import { AptosClient } from "aptos";

const { RPC_URL } = process.env;

const client = new AptosClient(RPC_URL);

export default client;
