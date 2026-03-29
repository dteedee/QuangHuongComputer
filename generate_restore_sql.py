import re

def create_sql():
    sql_commands = []
    
    # Process CatalogDbSeeder.cs
    with open('/home/teedee/Pictures/QuangHuongComputer/backend/Services/Catalog/Infrastructure/Data/CatalogDbSeeder.cs', 'r') as f:
        content = f.read()
    
    pattern = r'new Product\(\s*"([^"]+)",(?:.*?imageUrl:\s*"([^"]+)")'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for name, url in matches:
        name_escaped = name.replace("'", "''")
        url_escaped = url.replace("'", "''")
        sql_commands.append(f"""UPDATE "Products" SET "ImageUrl" = '{url_escaped}' WHERE "Name" = '{name_escaped}';""")
        
    # Process CatalogEndpoints.cs
    with open('/home/teedee/Pictures/QuangHuongComputer/backend/Services/Catalog/CatalogEndpoints.cs', 'r') as f:
        content2 = f.read()
        
    matches2 = re.findall(pattern, content2, re.DOTALL)
    for name, url in matches2:
        name_escaped = name.replace("'", "''")
        url_escaped = url.replace("'", "''")
        sql_commands.append(f"""UPDATE "Products" SET "ImageUrl" = '{url_escaped}' WHERE "Name" = '{name_escaped}';""")
        
    # Process ContentDbSeeder.cs for Posts
    with open('/home/teedee/Pictures/QuangHuongComputer/backend/Services/Content/Infrastructure/Data/ContentDbSeeder.cs', 'r') as f:
        content3 = f.read()
        
    pattern_posts = r'new Post\(\s*"([^"]+)",(?:.*?thumbnailUrl:\s*"([^"]+)")'
    matches3 = re.findall(pattern_posts, content3, re.DOTALL)
    for title, url in matches3:
        title_escaped = title.replace("'", "''")
        url_escaped = url.replace("'", "''")
        sql_commands.append(f"""UPDATE content.posts SET "ThumbnailUrl" = '{url_escaped}' WHERE "Title" = '{title_escaped}';""")

    with open('/home/teedee/Pictures/QuangHuongComputer/restore.sql', 'w') as f:
        f.write('\n'.join(sql_commands))
        
if __name__ == "__main__":
    create_sql()
