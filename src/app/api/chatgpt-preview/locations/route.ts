import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getImageUrl } from "@/lib/getImageUrl";

export async function GET() {
  const { data, error } = await supabase
    .from("locations")
    .select("id,name,address,description,image,active")
    .eq("active", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors du chargement des centres." },
      { status: 500 }
    );
  }

  const locations = (data || []).map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    description: location.description || "",
    image_url: location.image ? getImageUrl(location.image) : "",
  }));

  return NextResponse.json({ locations });
}
