import re

with open('supabase_schema.sql', 'r') as f:
    content = f.read()

# Add DROP POLICY IF EXISTS before every CREATE POLICY
def replacer(match):
    policy_name = match.group(1)
    table_name = match.group(2)
    return f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\nCREATE POLICY "{policy_name}" ON {table_name}'

new_content = re.sub(r'CREATE POLICY "([^"]+)" ON ([^\s]+)', replacer, content)

with open('supabase_schema.sql', 'w') as f:
    f.write(new_content)
