# Deploying Document Repository to Vercel

This document provides instructions for deploying the Document Repository application to Vercel. The application has been optimized to work well in a serverless environment.

## Prerequisites

- A Vercel account
- A Supabase account and project
- GitHub repository with your code

## Setup

### 1. Environment Variables

Make sure to set up the following environment variables in the Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key (optional)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small (optional)
MAX_UPLOAD_SIZE=50
```

### 2. Supabase Setup

Ensure your Supabase project has:

1. A storage bucket named "documentscollection" with appropriate permissions
2. Required database tables set up

### 3. Build Configuration

The project is configured to use the "standalone" output mode in Next.js, which optimizes it for serverless environments. This is set in `next.config.mjs`.

## Deployment Steps

1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. Add all environment variables
4. Deploy!

## Canvas Support

This application uses `@napi-rs/canvas` instead of the native `canvas` package to ensure compatibility with serverless environments. This allows PDF processing to work correctly on Vercel.

## Web Workers

The application uses web workers for processing:

- Tesseract.js for OCR
- PDF.js for PDF extraction
- Other document processing utilities

These are configured to work correctly in the Vercel environment.

## Large File Uploads

For handling large file uploads:

1. Client-side processing is used for PDFs, images, and other document types
2. Files are uploaded directly to Supabase storage, bypassing Vercel's function size limits
3. The 4.5MB API payload limit in Vercel is avoided by using this approach

## Troubleshooting

If you encounter issues:

- Check the Vercel build logs for errors
- Ensure all environment variables are set correctly
- Verify Supabase permissions and bucket configuration

## Testing After Deployment

After deploying, test the following functionality:

1. Document upload (PDF, DOCX, XLSX, images)
2. OCR processing of images
3. Text extraction from documents
4. Search functionality

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs) 