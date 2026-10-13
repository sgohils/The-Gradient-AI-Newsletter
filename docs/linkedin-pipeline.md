# Daily LinkedIn company Page posts

The daily publisher now prepares one LinkedIn text post from the first three stories in the committed newsletter, with short summaries, the full issue link, and hashtags. It reuses the existing Zernio integration and makes no additional LLM, image, or video calls. Posts stay below LinkedIn's 3,000-character limit. Every publication explicitly targets your company Page's organization URN; a missing Page target stops publication.

The existing schedule targets **7:00 AM America/New_York**, including daylight saving time. LinkedIn runs after the newsletter has been committed, so publication follows newsletter processing. Scheduled recovery attempts run at :17 and :37 each hour from 7 through 11 AM Eastern. Already published editions are skipped. GitHub may delay or drop scheduled runs; this is a target time. The edition date follows the newsletter's UTC date.

Live posting starts disabled. The code is added locally; it must reach the repository's default branch before these Actions workflows are available.

## 1. Connect the company Page in Zernio

1. Sign in to [Zernio](https://zernio.com) using your existing account, or create an account.
2. Confirm that your LinkedIn member account administers the company Page you want to post as. Create the Page or obtain the required admin access if needed.
3. In Zernio's connected accounts, add LinkedIn. Sign in with that member account, grant the requested access, and select the company Page in the account-selection step. Confirm the Page name before completing the connection.
4. Create or reuse a Zernio API key with access to this connection. Zernio handles LinkedIn OAuth; this implementation needs the Zernio key, rather than a separate LinkedIn developer application or access token. See [Zernio's LinkedIn connection documentation](https://docs.zernio.com/platforms/linkedin).

**Account allowance:** as checked on October 6, 2026, [Zernio pricing](https://zernio.com/pricing) includes two connected accounts free. Your YouTube channel and LinkedIn company Page use those two slots when they are your only connected accounts. The daily workflow publishes YouTube videos and LinkedIn text posts. Rendering and daily text preparation add no service subscriptions.

## 2. Find the two different IDs

You need both a **Zernio account ID** and a **LinkedIn company organization URN**. They are different identifiers; neither is the company Page's vanity URL.

- `ZERNIO_LINKEDIN_ACCOUNT_ID`: copy the `_id` of the connected `linkedin` account from Zernio's dashboard or [List accounts API](https://docs.zernio.com/accounts/list-accounts).
- `ZERNIO_LINKEDIN_ORGANIZATION_URN`: use `urn:li:organization:` followed by the numeric company ID. The organization's listing endpoint is `GET /v1/accounts/{accountId}/linkedin-organizations`, documented in [Zernio's LinkedIn guide](https://docs.zernio.com/platforms/linkedin). Select the record whose name matches your company Page.

If your key is stored only in GitHub, use **Actions → LinkedIn preview and activation check → Run workflow**, select **inspect_accounts=true**, and leave **publish=false**. The run summary and artifact list the connected account ID and administered company Page URNs. This mode makes only read requests to Zernio and does not require the account IDs or newsletter URL to be configured first.

If the dashboard does not expose both values, these read-only PowerShell commands list them without printing the API key:

```powershell
$taskZernioKey = Read-Host 'Zernio API key' -AsSecureString
$taskZernioCredential = New-Object System.Net.NetworkCredential('', $taskZernioKey)
$taskZernioHeaders = @{ Authorization = 'Bearer ' + $taskZernioCredential.Password }
$taskZernioAccounts = Invoke-RestMethod -Uri 'https://zernio.com/api/v1/accounts' -Headers $taskZernioHeaders
$taskZernioAccounts.accounts | Where-Object platform -eq 'linkedin' | Select-Object _id, username, displayName, isActive

$taskLinkedInAccountId = Read-Host 'Paste the LinkedIn account _id from the list'
$taskLinkedInOrganizations = Invoke-RestMethod -Uri "https://zernio.com/api/v1/accounts/$taskLinkedInAccountId/linkedin-organizations" -Headers $taskZernioHeaders
$taskLinkedInOrganizations.organizations | Select-Object id, name, @{Name='organizationUrn';Expression={'urn:li:organization:' + $_.id}}

Remove-Variable taskZernioKey, taskZernioCredential, taskZernioHeaders
```

Before submitting, the publisher checks that the account is an active LinkedIn connection and that its member administers the specified organization. Every request includes the explicit organization URN, even if the connected account's default posting identity changes.

## 3. Configure GitHub Actions

In [this repository's Actions settings](https://github.com/sgohils/The-Gradient-AI-Newsletter/settings/secrets/actions), add the following under **Settings → Secrets and variables → Actions**:

| Name | Store as | Value |
| --- | --- | --- |
| `ZERNIO_API_KEY` | **Secret** | Your Zernio API key; reuse the existing video secret if it covers the LinkedIn connection |
| `ZERNIO_LINKEDIN_ACCOUNT_ID` | **Variable** | The connected LinkedIn account's `_id` |
| `ZERNIO_LINKEDIN_ORGANIZATION_URN` | **Variable** | Your company Page URN, such as `urn:li:organization:123456789` |
| `NEWSLETTER_BASE_URL` | **Variable** | Your deployed newsletter's public HTTPS base URL, such as `https://your-newsletter.example` |
| `LINKEDIN_PUBLISH_ENABLED` | **Variable** | Start with `false`; change to `true` after the activation test |

The four Variables must be repository Actions **Variables**, because the workflows read `vars`. A Secret with the same name does not configure these fields. The URL must point to the real website, without credentials, query parameters, or a fragment. Open `{NEWSLETTER_BASE_URL}/archive/YYYY-MM-DD` for a recent edition to verify that your deployment serves the archive; the publisher does not wait for a website deployment to finish. The daily newsletter also receives this URL for its email links.

Enable GitHub Actions for the repository. The workflows request `contents: write` and must be allowed to commit and push `linkedin-state/YYYY-MM-DD.json` to the default branch. Check organization policies and branch protection/rulesets. If those rules reject the bot's pushes, resolve the automation permission before activation; setting the Git commit author does not grant access. A failed state push stops the external submission.

No new Groq/OpenAI, Resend, Pixazo, or YouTube credentials are needed for this LinkedIn step. Existing newsletter configuration still applies. LinkedIn also runs when video rendering is disabled.

## 4. Commit, push, and preview

Commit and push the LinkedIn implementation to the default branch, including the workflow files, `src/linkedin/`, `scripts/linkedin.ts`, tests, package script changes, and this guide.

Open **Actions → LinkedIn preview and activation check → Run workflow**:

1. Choose a date with an existing committed newsletter, or leave `issue_date` empty for today's UTC edition.
2. Leave `publish=false`.
3. Read the run summary and download the `linkedin-preview` artifact. Inspect `linkedin-output/YYYY-MM-DD/post.txt` for the headlines, summary wording, company voice, and correct archive URL. Previews need only the public URL and a committed edition; they do not contact Zernio or create a LinkedIn post.

The manual workflow reads an existing newsletter. It does not fetch feeds, send email, or generate a video. To create a missing current edition, run **Daily Newsletter Publisher** first. If the daily newsletter selects no stories, LinkedIn is skipped.

Local preview uses Node.js 20+ and npm. Copy the LinkedIn settings and public URL into the root `.env` example, then run:

```sh
npm ci
npm run linkedin:preview -- --issue-date YYYY-MM-DD
```

`linkedin-output/` is ignored by Git. Keep the API key in the ignored `.env`, with credentials excluded from source control. Local preview always stays offline even if `.env` has `LINKEDIN_PUBLISH_ENABLED=true`.

## 5. Test a live post, then enable daily posting

After reviewing **today's** preview, rerun **LinkedIn preview and activation check** with the same current `issue_date` and `publish=true`. This submits a real public post to the configured company Page. New submissions require today's UTC edition, so an old preview cannot accidentally publish stale news.

Confirm that the workflow reports `published`, open the returned LinkedIn URL, and check that the author is your company Page. Then set Actions **Variable** `LINKEDIN_PUBLISH_ENABLED=true`. Future daily runs will post automatically after newsletter publication. Leave the variable `false` to keep daily runs in preview mode; set it back to `false` to stop automatic posting. The manual workflow's `publish` input works independently of that daily switch.

Local live publishing is also explicit:

```sh
npm run linkedin:publish -- --issue-date YYYY-MM-DD
```

Local publication saves state only on that computer. For scheduled automation, use the Actions activation test so the publication record reaches the repository before the daily job runs. If you publish locally, preserve and commit the resulting `linkedin-state/YYYY-MM-DD.json` before enabling or rerunning Actions for that date.

## Monitoring and recovery

Daily runs retain `daily-linkedin-output` artifacts for seven days. The run summary includes the preview and publication status. Each edition's committed state contains the frozen content, Page target, submission key, provider ID, and result URL, with no API key. LinkedIn and video state-writing jobs run sequentially, and a LinkedIn failure does not suppress the video job.

- **Published:** complete; reruns make no new API request for that edition.
- **Pending:** a provider post ID exists. Later attempts read that post instead of creating another.
- **Blocked:** inspect the summary for a missing/inactive connection, Page access, old edition, or provider draft/cancellation. Correct setup errors before rerunning.
- **Failed with a post ID:** inspect and repair/retry that exact post in Zernio, then rerun the workflow to reconcile its status. The pipeline never creates a replacement for a known failed post.
- **Uncertain:** the POST may have succeeded without a usable response. Reruns preserve the exact content, company target, and key. [Zernio's documented idempotency window](https://docs.zernio.com/guides/idempotency) is 24 hours; after that window the pipeline stops automatic resubmission. Find the original post in Zernio and record its actual `postId` in the matching state file before reconciling. If the provider confirms that no post exists, an operator must resolve the saved uncertainty before attempting a new submission.

Once submission begins, the content and Page target are frozen. Changing website settings or newsletter text does not rewrite a pending request. Never delete a successful state record to force a repost. For older submitted editions, specify their date in the manual workflow with `publish=true` to reconcile a known ID; old editions with no prior submission cannot create a new post.

Authorization errors require checking the Zernio key and reconnecting LinkedIn with the required Page access. A `402` requires checking the account allowance. Temporary network/server failures and short rate-limit delays use bounded retries with the same key; longer provider delays are left for the next workflow attempt.

Regression tests cover Page targeting, durable intent, previews from newsletter Markdown, credential failures, duplicates, pending reconciliation, network retries, stale editions, state corruption, and the expired idempotency window:

```sh
npx vitest run __tests__/linkedin.test.ts
npm run lint
npm run typecheck
npm run build
```
