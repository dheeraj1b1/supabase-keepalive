# Supabase Keepalive

Tiny GitHub Actions utility that pings a Supabase project once per day so a lightly used portfolio database and storage bucket continue receiving activity.

It does not install dependencies and it performs only one or two lightweight requests:

- one optional table read with `limit=1`
- one optional storage object `HEAD` request
- a fallback project API ping if no table or storage target is configured

## GitHub setup

Create these repository secrets:

- `SUPABASE_URL`: your project URL, for example `https://qdcnpuncureormyezvbp.supabase.co`
- `SUPABASE_API_KEY`: your Supabase publishable key, or the legacy anon key if your project still uses legacy keys

Optional repository variables:

- `SUPABASE_KEEPALIVE_TABLE`: table to read one row from
- `SUPABASE_KEEPALIVE_BUCKET`: bucket name for a stored certificate
- `SUPABASE_KEEPALIVE_OBJECT`: path to one object inside that bucket

If you set the bucket variable, also set the object variable.

## Schedule

The workflow runs daily at `03:17 UTC`, which is `08:47 IST`. You can also run it manually from the GitHub Actions tab.

## Notes

Use a publishable or legacy anon key when possible. Only use a secret or service role key if your keepalive target is intentionally private and you understand that elevated keys can access more of your project.
