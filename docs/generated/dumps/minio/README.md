MinIO object seed directory used by docker-compose `minio-init`.

How restore works:
- If `docs/generated/dumps/minio/<S3_BUCKET>/` exists, files are mirrored into that bucket.
- Otherwise, if `docs/generated/dumps/minio/` contains files directly, they are mirrored into `<S3_BUCKET>`.
- If `docs/generated/dumps/minio/<S3_BUCKET_PRIVATE>/` exists, files are mirrored into that private bucket.

Example layout:
- docs/generated/dumps/minio/kenzap/S1000000/sketch-abc.webp
- docs/generated/dumps/minio/kenzap-private/private/path/file.pdf

Notes:
- `mc mirror --overwrite` is idempotent and safe to re-run.
- Bucket names come from `.env`: `S3_BUCKET` and `S3_BUCKET_PRIVATE`.
