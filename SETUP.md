# Turning on Google sign-in

Out of the box the site runs in **demo mode**: games and the editor list live
only in the browser that made them, and "Editor access" asks for an email
instead of using Google. To make games shared and sign-in real, connect a
Firebase project. It is free at this size, and takes about fifteen minutes.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
   Name it anything (for example `woodley-leaves-centerspread`). Analytics can
   be off.
2. In the project, open **Build → Authentication → Get started**. On the
   **Sign-in method** tab enable **Google** and save.
3. Still in Authentication, open **Settings → Authorized domains** and add
   `woodleyleavescenterspread.com` (and `localhost` is already there for testing).
4. Open **Build → Firestore Database → Create database**. Choose
   **production mode** and the default location.
5. Open **Rules**, replace everything with the contents of `firestore.rules`
   from this repo, and **Publish**.

## 2. Connect the site

1. In **Project settings** (the gear icon) scroll to **Your apps**, click the
   web icon `</>`, register the app (no hosting needed), and copy the
   `firebaseConfig` object it shows.
2. Open `config.js` and paste the values into the `firebase:` block, replacing
   `null`. Only `apiKey`, `authDomain`, `projectId` and `appId` are needed.
   These values are safe to commit: they identify the project, they don't
   grant access. The rules do that.
3. Commit and push. Vercel redeploys.

## 3. First sign-in

The accounts in `bootstrapEditors` (in `config.js`) and in `bootstrapEditors()`
(in `firestore.rules`) are editors from the start. Keep the two lists the same.
Sign in with one of them, click **Editors**, and add everyone else by their
Google account email. From then on the list lives in Firestore and anyone on
it can add or remove others.

The two games that shipped with the site stay until someone edits or removes
them in the editor.

## Troubleshooting

- **"This domain is not authorized"** after clicking Editor access: add the
  site's domain under Authentication → Settings → Authorized domains.
- **"Missing or insufficient permissions"** when saving: the rules were not
  published, or the signed-in email is not in the bootstrap list or the
  `editors` collection. Emails are compared lowercase.
- **Sign-in works but says no editor access:** the account's email is not on
  the list. An existing editor adds it under **Editors**.
