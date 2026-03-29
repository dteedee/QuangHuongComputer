import re
import psycopg2

def run():
    with open('/home/teedee/Pictures/QuangHuongComputer/backend/Services/Catalog/Infrastructure/Data/CatalogDbSeeder.cs', 'r') as f:
        content = f.read()
    
    conn = psycopg2.connect("dbname=quanghuongdb user=postgres host=localhost port=5432")
    cur = conn.cursor()
    
    # Simple parsing: find product name and imageUrl
    # new Product("Product Name", ... imageUrl: "URL")
    pattern = r'new Product\("([^"]+)",(?:.*?imageUrl:\s*"([^"]+)")'
    matches = re.findall(pattern, content, re.DOTALL)
    
    count = 0
    for name, url in matches:
        cur.execute('UPDATE "Products" SET "ImageUrl" = %s WHERE "Name" = %s', (url, name))
        count += cur.rowcount
    
    # Also find Cloudinary urls in CatalogEndpoints.cs
    with open('/home/teedee/Pictures/QuangHuongComputer/backend/Services/Catalog/CatalogEndpoints.cs', 'r') as f:
        content2 = f.read()
    
    matches2 = re.findall(pattern, content2, re.DOTALL)
    for name, url in matches2:
        cur.execute('UPDATE "Products" SET "ImageUrl" = %s WHERE "Name" = %s', (url, name))
        count += cur.rowcount

    # Also restore Content items
    # Too complex, let's just restore Products as they are complaining about products.
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"Updated {count} products!")

run()
