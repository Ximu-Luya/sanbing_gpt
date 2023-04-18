import { NextPage } from "next";
import { useState } from "react";


const Embeddings: NextPage = () => {
  const [url, setUrl] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/generate-embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        content
      })
    });

    setLoading(false);

    if (!response.ok) {
      // Handle error
    }
  };

  return (
    <div className="flex flex-col items-center max-w-xl m-auto text-center">
      <h1 className="w-full my-5 text-2xl font-bold sm:text-4xl ">
        Generate embeddings
      </h1>
      <p className="mb-4">
        Paste a list of URLs below to geneate embeddings using the OpenAI API, and add the embeddings to the Supabase embeddings table.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full h-[150px] textarea textarea-bordered"
          placeholder="Enter url here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <textarea
          className="w-full h-[150px] textarea textarea-bordered"
          placeholder="Enter Content here"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          className="my-4 btn btn-primary"
          type="submit"
          disabled={loading}
        >
          Generate Embeddings
        </button>
      </form>
      {loading && <div>Loading...</div>}
    </div>
  );
};

export default Embeddings;
