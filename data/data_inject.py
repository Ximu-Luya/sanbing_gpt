import json
import requests
import time

# 读取JSON文件中的对象数组
with open('sanbing.json', 'r') as f:
  data = json.load(f)

# 读取已完成的URL数组
with open('complete.json', 'r') as f:
  completed_urls = json.load(f)

def post(payload): 
  print(get_url_with_prefix(payload) + ': 请求中……')

  response = requests.post(
    'https://sanbing-gpt.vercel.app/api/generate-embeddings',
    json=payload
  )
  result = json.loads(response.text)
  print(payload['url'] + ': ' + str(result))
  return result

# 发送POST请求并等待响应结果中的“success”字段为“true”
def send_request(payload):
  result = post(payload)
  while not result['success']:
    time.sleep(1)
    result = post(payload)
  
  # 存储已完成的条目
  if result['success']:
    with open('complete.json', 'r') as f:
      urls = json.load(f)
    
    url_with_prefix = get_url_with_prefix(payload)
    urls.append(url_with_prefix)
    with open('complete.json', 'w') as f:
      json.dump(urls, f, ensure_ascii=False)

  return result

# 获取每个元素的标识符
def get_url_with_prefix(payload):
  content_prefix = payload['content'][:25].replace('\n', '')
  url_with_prefix = payload['url'] + '(' + content_prefix + ')'
  return url_with_prefix

count = 0
for obj in data:
  # 构造POST请求体，包含“url”和“content”两个字段
  count = count + 1

now_count = 0
# 遍历对象数组，针对每个对象，发送一个POST请求到指定接口
for obj in data:
  # 构造POST请求体，包含“url”和“content”两个字段
  now_count = now_count + 1
  payload = {'url': obj['url'], 'content': obj["content"]}
  url_with_prefix = get_url_with_prefix(payload)
  print(f"{now_count}/{count}")

  # 检查当前元素的URL是否已经在已完成的URL数组中存在
  if url_with_prefix in completed_urls:
    print(f"{url_with_prefix}: 已跳过")
    continue

  # 发送POST请求，并等待响应结果中的“success”字段为“true”
  response = send_request(payload)
