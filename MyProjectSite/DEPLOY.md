# How to Deploy Nexus for Free

You can host **Nexus** online for free using Vercel or Netlify. Both provide a free subdomain (e.g., `nexus-project.vercel.app`).

## Option 1: The Easiest Way (Netlify Drop)
No account setup required initially.

1.  Open your project folder: `C:\MyProjectSite`
2.  Locate the **`dist`** folder (created after running `npm run build`).
3.  Go to [app.netlify.com/drop](https://app.netlify.com/drop).
4.  **Drag and drop** the `dist` folder onto the page.
5.  **Boom.** You are online. You can rename the site in "Site Settings".

## Option 2: The Professional Way (Vercel)
Best for long-term updates.

1.  Create a GitHub repository and push this code.
2.  Go to [vercel.com](https://vercel.com) and login with GitHub.
3.  Click "Add New Project" -> Import your Nexus repo.
4.  Click **Deploy**.
5.  Vercel will give you a free domain: `nexus-app.vercel.app`.

## Option 3: Command Line (Advanced)
If you have `npm` installed globally:

1.  Run `npx vercel` in this terminal.
2.  Follow the prompts to login/deploy.
