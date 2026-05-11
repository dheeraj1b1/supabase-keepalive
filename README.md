# Portfolio Keepalive

Tiny GitHub Actions utility that pings a Supabase project and a Streamlit ATS app so a lightly used portfolio stack keeps receiving activity.

It does not install dependencies and it performs lightweight requests:

- one optional Supabase table read with `limit=1`
- one optional Supabase Storage object `HEAD` request
- one public GET request to the Streamlit ATS app
- a fallback Supabase project API ping if no Supabase table or Storage target is configured

## GitHub setup

Create these repository secrets:

- `SUPABASE_URL`: your project URL, for example `https://qdcnpuncureormyezvbp.supabase.co`
- `SUPABASE_API_KEY`: your Supabase publishable key, or the legacy anon key if your project still uses legacy keys

Recommended repository variables for this project:

- `SUPABASE_KEEPALIVE_TABLE`: `keepalive_ping`
- `SUPABASE_KEEPALIVE_BUCKET`: `certificates`
- `SUPABASE_KEEPALIVE_OBJECT`: `07_infosys_genai_for_all.pdf`

The bucket/object values above touch one small public certificate PDF with a `HEAD` request, so the workflow confirms Storage is reachable without downloading the file.

The workflow also pings this ATS app directly:

- `https://my-ats-007.streamlit.app/`

## Schedule

The workflow runs twice daily at `03:17 UTC` and `15:17 UTC`, which is `08:47 IST` and `20:47 IST`. You can also run it manually from the GitHub Actions tab.

## Notes

Use a publishable or legacy anon key when possible. Only use a secret or service role key if your keepalive target is intentionally private and you understand that elevated keys can access more of your project.
