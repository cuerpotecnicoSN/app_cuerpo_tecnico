import json
import re
import os

transcript_path = "/Users/imac/.gemini/antigravity-ide/brain/0a2c9b9f-54b6-4985-bd9b-a7eaffcbc4cf/.system_generated/logs/transcript_full.jsonl"
components_dir = "/Users/imac/Programas/app_cuerpo_tecnico/src/components/pro"

os.makedirs(components_dir, exist_ok=True)

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT':
                content = data.get('content', '')
                if 'import React' in content and 'export default function' in content:
                    # try to extract the component name
                    match = re.search(r'export default function\s+([A-Za-z0-9_]+)', content)
                    if match:
                        comp_name = match.group(1)
                        # The content might have <USER_REQUEST> tags if we parse it, but transcript_full usually has the raw text inside content.
                        # We should strip <USER_REQUEST> just in case.
                        clean_content = content.replace('<USER_REQUEST>', '').replace('</USER_REQUEST>', '').strip()
                        file_path = os.path.join(components_dir, f"{comp_name}.tsx")
                        with open(file_path, 'w') as out:
                            out.write(clean_content)
                        print(f"Extracted {comp_name}.tsx")
        except Exception as e:
            pass

