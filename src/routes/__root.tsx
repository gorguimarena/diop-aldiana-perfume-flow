import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Diop Aldiana Parfumerie — Gestion de stock" },
      { name: "description", content: "Plateforme de gestion de stock et de ventes pour Diop Aldiana Parfumerie." },
      { property: "og:title", content: "Diop Aldiana Parfumerie — Gestion de stock" },
      { name: "twitter:title", content: "Diop Aldiana Parfumerie — Gestion de stock" },
      { property: "og:description", content: "Plateforme de gestion de stock et de ventes pour Diop Aldiana Parfumerie." },
      { name: "twitter:description", content: "Plateforme de gestion de stock et de ventes pour Diop Aldiana Parfumerie." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d4bc07b5-f475-4084-8fbc-537e8eaf7d28/id-preview-f54f9f45--ce498426-b02b-41ec-80ad-bcad7fc359f9.lovable.app-1779744433762.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d4bc07b5-f475-4084-8fbc-537e8eaf7d28/id-preview-f54f9f45--ce498426-b02b-41ec-80ad-bcad7fc359f9.lovable.app-1779744433762.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
