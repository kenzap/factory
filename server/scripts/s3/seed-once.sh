#!/bin/sh
set -eu

MARKER_FILE="/data/.seeded-from-dump"
SEED_ROOT="/seed/s3"
PUBLIC_BUCKET="${S3_BUCKET:-kenzap}"
PRIVATE_BUCKET="${S3_BUCKET_PRIVATE:-kenzap-private}"
S3_ENDPOINT="${S3_ENDPOINT_INTERNAL:-http://seaweedfs:8333}"

echo "[s3-seed] Waiting for S3 endpoint: ${S3_ENDPOINT}"
until aws --endpoint-url "${S3_ENDPOINT}" s3api list-buckets >/dev/null 2>&1; do
  sleep 1
done

echo "[s3-seed] Ensuring buckets exist"
aws --endpoint-url "${S3_ENDPOINT}" s3api create-bucket --bucket "${PUBLIC_BUCKET}" >/dev/null 2>&1 || true
aws --endpoint-url "${S3_ENDPOINT}" s3api create-bucket --bucket "${PRIVATE_BUCKET}" >/dev/null 2>&1 || true

echo "[s3-seed] Applying public-read policy to ${PUBLIC_BUCKET}"
aws --endpoint-url "${S3_ENDPOINT}" s3api put-bucket-policy \
  --bucket "${PUBLIC_BUCKET}" \
  --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicRead\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::${PUBLIC_BUCKET}/*\"]}]}" \
  >/dev/null 2>&1 || true

if [ -f "${MARKER_FILE}" ]; then
  echo "[s3-seed] Seed marker exists. Skipping import."
  exit 0
fi

if [ -d "${SEED_ROOT}/${PUBLIC_BUCKET}" ]; then
  echo "[s3-seed] Importing public bucket from ${SEED_ROOT}/${PUBLIC_BUCKET}"
  aws --endpoint-url "${S3_ENDPOINT}" s3 sync "${SEED_ROOT}/${PUBLIC_BUCKET}" "s3://${PUBLIC_BUCKET}" \
    --exclude ".DS_Store" --exclude "*/.DS_Store" \
    --exclude "._*" --exclude "*/._*" \
    --exclude ".Spotlight-V100/*" --exclude ".Trashes/*" \
    --no-progress
elif [ -d "${SEED_ROOT}" ] && [ -n "$(ls -A "${SEED_ROOT}" 2>/dev/null)" ]; then
  echo "[s3-seed] Importing fallback public bucket content from ${SEED_ROOT}"
  aws --endpoint-url "${S3_ENDPOINT}" s3 sync "${SEED_ROOT}" "s3://${PUBLIC_BUCKET}" \
    --exclude ".DS_Store" --exclude "*/.DS_Store" \
    --exclude "._*" --exclude "*/._*" \
    --exclude ".Spotlight-V100/*" --exclude ".Trashes/*" \
    --exclude "${PRIVATE_BUCKET}/*" \
    --no-progress
else
  echo "[s3-seed] No seed files found at ${SEED_ROOT}. Skipping import."
fi

if [ -d "${SEED_ROOT}/${PRIVATE_BUCKET}" ]; then
  echo "[s3-seed] Importing private bucket from ${SEED_ROOT}/${PRIVATE_BUCKET}"
  aws --endpoint-url "${S3_ENDPOINT}" s3 sync "${SEED_ROOT}/${PRIVATE_BUCKET}" "s3://${PRIVATE_BUCKET}" \
    --exclude ".DS_Store" --exclude "*/.DS_Store" \
    --exclude "._*" --exclude "*/._*" \
    --exclude ".Spotlight-V100/*" --exclude ".Trashes/*" \
    --no-progress
fi

touch "${MARKER_FILE}"
echo "[s3-seed] Seed complete. Marker created at ${MARKER_FILE}"
