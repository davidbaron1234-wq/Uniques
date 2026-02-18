import { NextResponse } from "next/server";

// המפתח שלך בפנים - מוכן לעבודה
const REBRICKABLE_KEY = "2d0b95922ea0219a79cd02d18979ed76"; 

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const setNum = searchParams.get("set"); 

    if (!setNum) {
      return NextResponse.json({ error: "Set number required" }, { status: 400 });
    }

    // Rebrickable דורש פורמט של "12345-1"
    const formattedSet = setNum.includes("-") ? setNum : `${setNum}-1`;

    console.log(`🧱 Searching Rebrickable for: ${formattedSet}`);

    const res = await fetch(`https://rebrickable.com/api/v3/lego/sets/${formattedSet}/`, {
      headers: {
        "Authorization": `key ${REBRICKABLE_KEY}`
      }
    });

    if (!res.ok) {
        console.log("❌ Lego Set Not Found");
        return NextResponse.json({ found: false }, { status: 404 });
    }

    const data = await res.json();

    return NextResponse.json({
        found: true,
        name: data.name,
        year: data.year,
        num_parts: data.num_parts,
        image: data.set_img_url,
        url: data.set_url
    });

  } catch (error) {
    console.error("Lego Server Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}