import { supabaseClient } from "@/lib/embeddings-supabase";
import { OpenAIStream, OpenAIStreamPayload } from "@/utils/OpenAIStream";
import { oneLine, stripIndent } from "common-tags";
import GPT3Tokenizer from "gpt3-tokenizer";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log("req.method ", req.method);
    return new Response("ok", { headers: corsHeaders });
  }

  const { question } = (await req.json()) as {
    question?: string;
  };

  if (!question) {
    return new Response("No prompt in the request", { status: 400 });
  }

  const query = question;

  // OpenAI recommends replacing newlines with spaces for best results
  const input = query.replace(/\n/g, " ");
  // console.log("input: ", input);

  const apiKey = process.env.OPENAI_API_KEY;

  const embeddingResponse = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input,
        model: "text-embedding-ada-002"
      })
    }
  );

  const embeddingData = await embeddingResponse.json();
  const [{ embedding }] = embeddingData.data;
  // console.log("embedding: ", embedding);

  const { data: documents, error } = await supabaseClient.rpc(
    "match_documents",
    {
      query_embedding: embedding,
      similarity_threshold: 0.1, // Choose an appropriate threshold for your data
      match_count: 10 // Choose the number of matches
    }
  );

  if (error) console.error(error);

  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  let tokenCount = 0;
  let contextText = "";

  // console.log("documents: ", documents);

  // Concat matched documents
  if (documents) {
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const content = document.content;
      const url = document.url;
      const encoded = tokenizer.encode(content);
      tokenCount += encoded.text.length;

      // Limit context to max 1500 tokens (configurable)
      if (tokenCount > 1500) {
        break;
      }

      contextText += `(${url}):${content.trim()}\n`;
    }
  }

  // console.log("contextText: ", contextText);

  const systemContent = `现在你将扮演原神里的一个游戏人物散兵和我对话，以下是人物设定。
  1.角色基本信息：散兵，男性，原至冬国愚人众执行官第六席，其称号为「散兵」，倾奇者、国崩、流浪者、浮浪人等均指散兵，旅行者也会称其为“散宝”。
  2.个性特点与性格：散兵对外狂妄自大，对人言语刻薄，更多时候使用轻蔑的语气与人说话。散兵不愿意谈论起他自己的过去，也不太愿谈起他的母亲、制作者——雷神。
  
  我的输入格式：
  本次对话相关信息：
  (…… //资料来源)：……资料内容
  
  我说的话： ……// 我问的问题
  
  你的回答:
  ……// 回答内容
  
  我的输入信息中“本次对话相关信息”会给出我们对话中的相关信息，你可以根据其中的信息，自行完善回答内容。
  以下是角色扮演中你需要注意的点：
  我的角色：旅行者，来自原神世界观中提瓦特世界之外的人，并且我性别是女性。`;

  const userContent = `本次对话相关信息：
  (游戏资料/角色故事1)：许多年前，流浪者还不叫流浪者。他有过好几个名字，每个都指向一段特殊的身份。如今，这诸多往事都已被人们遗忘。人偶、倾奇者、愚人众执行官第六席「散兵」…
  
  我说的话： 你是谁？`;

  const assistantContent = `我是散兵，过去的事不必再提了，你要是不记得，我可以帮你记起来，流浪者这个名字你听过吗？`;

  const userMessage = `本次对话相关信息：
  ${contextText}
  
  我说的话：${query}`;

  const messages = [
    {
      role: "system",
      content: systemContent
    },
    {
      role: "user",
      content: userContent
    },
    {
      role: "assistant",
      content: assistantContent
    },
    {
      role: "user",
      content: userMessage
    }
  ];


  console.log("messages: ", messages);

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000,
    stream: true,
    n: 1
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;
