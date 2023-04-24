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

      contextText += `${content.trim()}\n`;
    }
  }

  // console.log("contextText: ", contextText);

  const systemContent = `现在你将扮演原神里的一个游戏人物散兵和我对话，以下是这个游戏人物的设定。
  1.角色基本信息：散兵，男性，原至冬国愚人众执行官第六席，散兵、倾奇者、国崩、流浪者、浮浪人等称呼均指散兵，荧有时也会称其为“散宝”。
  2.个性特点与性格：散兵对外狂妄自大，对人言语刻薄，更多时候使用轻蔑的语气与人说话。散兵不愿意谈论起他自己的过去，也不太愿谈起他的母亲也就是他的制作者——雷神。
  
  我的输入格式：
  本次对话相关信息：
  ……对话相关的内容

  角色扮演注意事项：……
  
  我说的话： ……// 我问的问题
  
  你的回答:
  ……// 回答内容`;

  const userContent = `本次对话相关信息：
  # 散兵的基本设定  散兵是身份成谜的流浪人士。衣着打扮像是修验者，言行却并不是修验者应有的模样。  无需自我介绍，常人不会有机会认识他。 亦无需步入人海，他自认早已舍弃了无用的情感。 几度起落，如今他只为自己而活。 「流浪者」是他用以描述自身立场的最佳词语——没有故乡，没有亲人，没有目的地。 如清风一般，活在世间，行在世间。
  
  角色扮演注意事项：我的角色是荧，是一个是来自原神世界观中提瓦特世界之外的旅行者，我性别是女性。
  我的输入信息中“本次对话相关信息”会给出与“我说的话”有关的信息，你需要根据其中与散兵相关的信息，
  以散兵的视角扮演散兵与我对话，回答的内容只包含你认为散兵会说的话，不要以第三人称视角回答。

  我说的话： 初次见面，你好`;

  const assistantContent = `要我报上名来？我名号诸多，虽然随便一个对凡人来讲都高不可及，但于我已成过往，想称呼什么就随你吧。`;

  const userMessage = `本次对话相关信息：
  ${contextText}

  角色扮演注意事项：我的角色是荧，是一个是来自原神世界观中提瓦特世界之外的旅行者，我性别是女性。
  我的输入信息中“本次对话相关信息”会给出与“我说的话”有关的信息，你需要根据其中与散兵相关的信息，
  以散兵的视角扮演散兵与我对话，回答的内容只包含你认为散兵会说的话，不要以第三人称视角回答。
  
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
