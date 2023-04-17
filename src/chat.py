import os

from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from langchain.document_loaders import TextLoader
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import DeepLake

from config import AiasConfig

aias_config = AiasConfig()

os.environ["OPENAI_API_KEY"] = aias_config.get_openai_api_key()
embeddings = OpenAIEmbeddings()

root_dir = "./src"
dataset_path = "hub://yoshikouki/aias"


docs = []
for dirpath, dirnames, filenames in os.walk(root_dir):
    for file in filenames:
        try:
            file_path = os.path.join(dirpath, file)
            print("loading:", file_path, "...")
            loader = TextLoader(file_path, encoding="utf-8")
            docs.extend(loader.load_and_split())
        except Exception:
            pass


text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
texts = text_splitter.split_documents(docs)

db = DeepLake.from_documents(texts, embeddings, dataset_path=dataset_path)

print("Index the code base is done to", dataset_path)

db = DeepLake(dataset_path=dataset_path, read_only=True, embedding_function=embeddings)

retriever = db.as_retriever()
retriever.search_kwargs["distance_metric"] = "cos"
retriever.search_kwargs["fetch_k"] = 100
retriever.search_kwargs["maximal_marginal_relevance"] = True
retriever.search_kwargs["k"] = 20

# model = ChatOpenAI(model_name='gpt-4') # 'gpt-3.5-turbo',
model = ChatOpenAI(model_name="gpt-3.5-turbo")
qa = ConversationalRetrievalChain.from_llm(model, retriever=retriever)

questions = [
    "関数 chat_with_gpt をリファクタリングしてください",
]
chat_history = []

for question in questions:
    result = qa({"question": question, "chat_history": chat_history})
    chat_history.append((question, result["answer"]))
    print(f"-> **Question**: {question} \n")
    print(f"**Answer**: {result['answer']} \n")
