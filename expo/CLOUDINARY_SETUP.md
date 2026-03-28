# Cloudinary Setup Guide for CauseAI Study Groups

## 📦 What is Cloudinary?

Cloudinary is a cloud-based service for storing and managing files (images, videos, documents, etc.). We use it to:

- Store study group attachments
- Generate downloadable URLs for emails
- Handle all file types (PDFs, Word docs, images, etc.)

## 🆓 Free Tier Benefits

- **25 credits/month** (plenty for your needs)
- **25GB storage**
- **25GB bandwidth**
- All file types supported
- No credit card required

---

## 🚀 Setup Steps

### 1. Create Cloudinary Account

1. Go to: **https://cloudinary.com/users/register/free**
2. Sign up with your email
3. Verify your email address
4. Complete the account setup

### 2. Get Your Credentials

1. Go to: **https://console.cloudinary.com/console**
2. You'll see your **Dashboard** with:
   - **Cloud Name** (e.g., `dxyourcloudname`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click "👁️ Show" to reveal)

### 3. Configure Backend

Edit `backend/.env` and add your Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example:**

```env
CLOUDINARY_CLOUD_NAME=dxabc123xyz
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 4. Restart Backend Server

```bash
cd backend
npm start
```

You should see:

```
✓ Firebase Admin initialized successfully
✓ SMTP server is ready to send emails
```

---

## 📱 How It Works

### Current Flow (Local Files):

```
User attaches file → Stored locally → Firestore has URI → Email shows filename only
❌ Problem: Recipients can't download files from email
```

### New Flow (With Cloudinary):

```
User attaches file → Upload to Cloudinary → Get URL → Store in Firestore → Email has download button
✅ Solution: Recipients can click "Download" in email
```

---

## 🔧 Implementation

### Option 1: Manual Upload (Current)

Files are attached but not uploaded to Cloudinary yet. Email shows filenames but no download links.

### Option 2: Automatic Upload (Need to implement)

When sending a message with attachments:

1. Convert file URI to base64
2. Upload to Cloudinary via backend API
3. Get back secure URL
4. Store URL in Firestore attachment object
5. Email includes clickable download buttons

**To implement automatic upload:**

```typescript
// In study-groups.tsx, before sending message:
if (attachments.length > 0) {
	const uploadResult = await apiService.uploadFiles(attachments);
	if (uploadResult.success) {
		// Use uploadResult.files which now have URLs
		cloudinaryAttachments = uploadResult.files;
	}
}

await sendGroupMessage(
	selectedGroup.id,
	user.email,
	messageText.trim(),
	cloudinaryAttachments // These now have .url property
);
```

---

## 📧 Email Appearance

### Before (Without Cloudinary):

```
📎 2 Files Attached
📄 lecture_notes.pdf
   application/pdf
⚠️ Open the CauseAI app to view these attachments
```

### After (With Cloudinary):

```
📎 2 Files Attached
📄 lecture_notes.pdf
   application/pdf
   [⬇️ Download]  ← Clickable button!

📄 study_guide.docx
   application/vnd...
   [⬇️ Download]  ← Clickable button!
```

---

## 🔐 Security Features

1. **Folder Organization**: All files stored in `causeai-study-groups/` folder
2. **Unique Filenames**: Each upload gets timestamp + sanitized name
3. **File Size Limit**: 10MB per file (configurable)
4. **API Key Protection**: Only authenticated requests can upload
5. **Secure URLs**: HTTPS URLs for all files

---

## 📊 Monitoring Usage

Check your Cloudinary dashboard:

- **Storage used**: How much space your files take
- **Bandwidth used**: How many times files were downloaded
- **Transformations**: Not used for documents (only for images)

---

## 🎯 Next Steps

1. **Sign up for Cloudinary** (5 minutes)
2. **Add credentials to `.env`** (1 minute)
3. **Restart backend** (30 seconds)
4. **Test upload endpoint** with Postman/curl (optional)
5. **Implement automatic upload in app** (needs code changes)

---

## 🆘 Troubleshooting

### "Invalid credentials" error

- Double-check Cloud Name, API Key, and API Secret
- Make sure there are no extra spaces
- Ensure you copied the full API Secret

### Files not uploading

- Check file size (must be < 10MB)
- Check backend logs for errors
- Verify API_SECRET matches in both `.env` files

### Can't download from email

- Make sure attachment has `.url` property
- Check Cloudinary dashboard to verify file was uploaded
- Test the URL directly in browser

---

## 💡 Alternative: Expo FileSystem

If you don't want to use Cloudinary, you could:

1. Install `expo-file-system`
2. Read files as base64
3. Store in Firestore directly (not recommended for large files)
4. Download in-app only (no email downloads)

**Cloudinary is recommended** because:

- Separate storage from database
- Better performance
- Email download capability
- Free tier is generous
- Professional CDN delivery

---

## 📝 Summary

**Before:** Attachments exist locally only, can't be shared via email
**After:** Attachments uploaded to cloud, downloadable from anywhere

**Setup time:** ~5 minutes
**Cost:** Free (25 credits/month)
**Benefit:** Professional file management with email downloads
