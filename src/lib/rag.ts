import { PineconeStore } from '@langchain/pinecone'
import { PineconeEmbeddings } from '@langchain/pinecone'
import { getPineconeClient, PINECONE_INDEX, EMBEDDING_MODEL, RECIPE_NAMESPACE } from './pinecone'

export async function searchRecipes(query: string, k = 5) {
  const client = getPineconeClient()
  const index = client.index(PINECONE_INDEX)
  const embeddings = new PineconeEmbeddings({ model: EMBEDDING_MODEL })

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: RECIPE_NAMESPACE,
  })

  return vectorStore.similaritySearch(query, k)
}
