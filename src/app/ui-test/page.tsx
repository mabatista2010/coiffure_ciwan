"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  FilterBar,
  SectionHeader,
  StatusBadge,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UiTestPage() {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("pending");

  return (
    <main className="admin-scope relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(212,160,23,0.18),transparent_42%),radial-gradient(circle_at_88%_12%,rgba(212,160,23,0.12),transparent_34%),linear-gradient(180deg,#0f0f0f_0%,#060606_100%)] px-6 py-10 text-foreground md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:100%_48px] opacity-25" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/50 bg-black/45 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Laboratoire UI
          </p>
          <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Kit shadcn style Steel & Blade
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Espace de test pour valider les composants avant integration. Le
            style est volontairement plus marque: dark premium, accent dore et
            contraste fort.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle className="text-foreground">
                Boutons signature
              </CardTitle>
              <CardDescription>
                Variantes principales pour actions critiques et secondaires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button">Principal</Button>
                <Button type="button" variant="secondary">
                  Secondaire
                </Button>
                <Button type="button" variant="outline">
                  Contour
                </Button>
                <Button type="button" variant="ghost">
                  Minimal
                </Button>
                <Button type="button" variant="destructive">
                  Supprimer
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Defaut</Badge>
                <Badge variant="secondary">Secondaire</Badge>
                <Badge variant="outline">Contour</Badge>
                <Badge variant="success">Succes</Badge>
                <Badge variant="warning">Alerte</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Le bouton principal est pense pour les CTA de reservation.
            </CardFooter>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardHeader>
              <CardTitle className="text-foreground">Formulaire</CardTitle>
              <CardDescription>
                Champ de saisie avec focus/ring alignes sur la couleur marque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <Input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Nom du client"
              />
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Etat de reservation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmee</SelectItem>
                  <SelectItem value="completed">Terminee</SelectItem>
                  <SelectItem value="cancelled">Annulee</SelectItem>
                </SelectContent>
              </Select>
              <p>
                Valeur saisie:{" "}
                <span className="text-primary">{nombre || "aucune"}</span>
              </p>
              <p>
                Etat actuel: <StatusBadge status={estado} />
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-800">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Table</CardTitle>
              <CardDescription>
                Verification de la densite visuelle sur les listes admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Lucas Martin</TableCell>
                    <TableCell>Coupe + Barbe</TableCell>
                    <TableCell>
                      <StatusBadge status="confirmed" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Hugo Bernard</TableCell>
                    <TableCell>Coloration</TableCell>
                    <TableCell>
                      <StatusBadge status="pending" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-900">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                Dialog de demonstration
              </CardTitle>
              <CardDescription>
                Validation de modal Radix + styles shadcn personnalises.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Teste l&apos;overlay, le focus clavier, le bouton de fermeture
                et les actions.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary">
                    Ouvrir le modal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouvelle reservation test</DialogTitle>
                    <DialogDescription>
                      Exemple rapide sans persistance, uniquement pour valider
                      le composant.
                    </DialogDescription>
                  </DialogHeader>
                  <Input placeholder="Telephone du client" />
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Annuler
                      </Button>
                    </DialogClose>
                    <Button type="button">Sauvegarder</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </section>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-[1100ms]">
          <SectionHeader
            title="Composants admin"
            description="Apercu de la couche reusable au-dessus de shadcn."
            actions={<Button variant="outline">Action exemple</Button>}
          />
          <div className="mt-4 grid gap-4">
            <FilterBar
              actions={
                <>
                  <Button variant="ghost">Reinitialiser</Button>
                  <Button>Appliquer</Button>
                </>
              }
            >
              <Input placeholder="Client" />
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmee</SelectItem>
                </SelectContent>
              </Select>
            </FilterBar>
            <AdminCard tone="highlight">
              <AdminCardHeader>
                <CardTitle className="text-foreground">AdminCard</CardTitle>
                <CardDescription>
                  Composant de conteneur unifie pour les blocs admin.
                </CardDescription>
              </AdminCardHeader>
              <AdminCardContent className="text-sm text-muted-foreground">
                Structure cible: `SectionHeader` + `FilterBar` + `AdminCard` +
                composants de formulaire/table.
              </AdminCardContent>
            </AdminCard>
          </div>
        </section>
      </div>
    </main>
  );
}
