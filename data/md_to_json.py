import os
import json

# 定义用于存放结果的数组
result = []

# 遍历文件夹中的所有文件
for filename in os.listdir('sanbing'):
    # 如果是 md 文件则进行处理
    if filename.endswith('.md'):
        # 获取文件名（不包含后缀）
        name = os.path.splitext(filename)[0]
        # 读取文件内容
        with open(os.path.join('sanbing', filename), 'r', encoding='utf-8') as f:
            content = f.read()
        # 将标题添加到内容前面
        content = f"# {name}\n\n{content}"
        # 创建结果对象并添加到数组中
        result.append({'url': name, 'content': content})

# 将结果保存为 JSON 文件
with open('sanbing.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=4)
