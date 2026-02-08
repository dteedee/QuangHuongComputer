# 🔐 SECURITY GUIDELINES - Quang Hương Computer

## ⚠️ CRITICAL: Secret Management

### 🚫 NEVER Commit These Files to Git:

1. **appsettings.Development.json** - Contains real secrets for development
2. **appsettings.Production.json** - Contains real secrets for production
3. **.env** files - Contains API keys and credentials
4. **secrets.json** - User secrets

### ✅ Files Safe to Commit:

1. **appsettings.json** - Template with empty/placeholder values only
2. **appsettings.example.json** - Example configuration
3. **.env.example** - Example environment variables

---

## 📋 Setup Instructions for New Developers

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/QuangHuongComputer.git
cd QuangHuongComputer
```

### 2. Create `appsettings.Development.json`
```bash
cd backend/ApiGateway
cp appsettings.json appsettings.Development.json
```

### 3. Fill in the secrets in `appsettings.Development.json`:

```json
{
  "OAuth": {
    "Google": {
      "ClientId": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      "ClientSecret": "YOUR_GOOGLE_CLIENT_SECRET"
    }
  },
  "Storage": {
    "CloudinaryUrl": "cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
  },
  "AI": {
    "OpenAI": {
      "ApiKey": "YOUR_OPENAI_API_KEY"
    },
    "Gemini": {
      "ApiKey": "YOUR_GEMINI_API_KEY"
    }
  }
}
```

### 4. Create frontend `.env` file:
```bash
cd ../../frontend
cp .env.example .env
```

### 5. Fill in `.env`:
```env
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
VITE_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
```

---

## 🔑 Where to Get API Keys

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Add to `appsettings.Development.json` and `.env`

### Cloudinary
1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get Cloud Name, API Key, API Secret from Dashboard
3. Format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Add to `appsettings.Development.json`

### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `appsettings.Development.json`

---

## 🛡️ Security Best Practices

### 1. Rotate Secrets Immediately If Leaked
If you accidentally commit secrets:
- **Revoke** the old keys immediately
- **Generate** new keys
- **Update** all environments

### 2. Use Different Secrets for Each Environment
- Development secrets ≠ Production secrets
- Never use production secrets in development

### 3. Check Before Committing
```bash
# Check what you're committing
git diff --cached

# Verify no secrets
git diff --cached | grep -i "secret\|password\|key"
```

### 4. Use Environment Variables in Production
For production deployments, use:
- Azure Key Vault
- AWS Secrets Manager
- Docker secrets
- Kubernetes secrets

---

## 🚨 What to Do If Secrets Are Leaked

### Immediate Actions:

1. **Revoke the compromised secrets immediately**
   - Google OAuth: Delete client ID in Google Cloud Console
   - OpenAI: Revoke API key
   - Cloudinary: Regenerate API credentials

2. **Remove from Git history**
   ```bash
   # Use git filter-branch or BFG Repo-Cleaner
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch PATH/TO/SECRET/FILE" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (WARNING: destructive)
   git push origin --force --all
   ```

3. **Generate new secrets**

4. **Update all team members**

5. **Monitor for suspicious activity**

---

## ✅ Git Pre-commit Hook (Recommended)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for secrets before committing
if git diff --cached | grep -i "GOCSPX-\|sk-\|cloudinary://"; then
  echo "❌ ERROR: Potential secret detected!"
  echo "Please remove secrets before committing."
  exit 1
fi

# Check for sensitive files
SENSITIVE_FILES=(
  "appsettings.Development.json"
  "appsettings.Production.json"
  ".env.local"
)

for file in "${SENSITIVE_FILES[@]}"; do
  if git diff --cached --name-only | grep -q "$file"; then
    echo "❌ ERROR: Attempting to commit sensitive file: $file"
    exit 1
  fi
done

echo "✅ Pre-commit checks passed"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📚 Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [.NET User Secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets)

---

## 📞 Contact

If you discover a security vulnerability, please email: security@quanghuongcomputer.com

**DO NOT** create a public GitHub issue for security vulnerabilities.
