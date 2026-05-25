import { Pinecone } from '@pinecone-database/pinecone'

let _client: Pinecone | null = null

export function getPineconeClient(): Pinecone {
  if (!_client) {
    _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  }
  return _client
}

export const PINECONE_INDEX = 'refrigerator-detective'
export const EMBEDDING_MODEL = 'llama-text-embed-v2'
export const RECIPE_NAMESPACE = 'recipe'
