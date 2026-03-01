S3 object seed directory used by docker-compose `s3-seed`.

How restore works:
- If `docs/generated/dumps/s3/<S3_BUCKET>/` exists, files are mirrored into that bucket.
- Otherwise, if `docs/generated/dumps/s3/` contains files directly, they are mirrored into `<S3_BUCKET>`.
- If `docs/generated/dumps/s3/<S3_BUCKET_PRIVATE>/` exists, files are mirrored into that private bucket.

Example layout:
- docs/generated/dumps/s3/kenzap/S1000000/sketch-abc.webp
- docs/generated/dumps/s3/kenzap-private/private/path/file.pdf

Notes:
- `aws s3 sync` is idempotent and safe to re-run.
- Bucket names come from `.env`: `S3_BUCKET` and `S3_BUCKET_PRIVATE`.
