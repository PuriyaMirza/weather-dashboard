export interface GlossaryTerm {
  term: string;
  /** Other names a reader may meet in field guides or on eBird. */
  aka?: string;
  definition: string;
}

export interface GlossarySection {
  title: string;
  terms: GlossaryTerm[];
}

/**
 * The vocabulary the guide's ID tips lean on, plus the birding slang a beginner meets on eBird
 * and on park walks. Grouped the way people learn it: parts of a bird first, then behaviour, then
 * the jargon.
 */
export const GLOSSARY: GlossarySection[] = [
  {
    title: 'Parts of a bird',
    terms: [
      { term: 'Field mark', definition: 'Any visible feature that helps tell one species from another — a wingbar, an eye ring, a tail pattern.' },
      { term: 'Crown', definition: 'The top of the head.' },
      { term: 'Nape', definition: 'The back of the neck.' },
      { term: 'Eyebrow', aka: 'supercilium', definition: 'A pale or colored stripe just above the eye.' },
      { term: 'Eye-line', definition: 'A dark stripe running through the eye.' },
      { term: 'Eye ring', definition: 'A ring of contrasting feathers around the eye. "Broken" means it has gaps in front of and behind the eye.' },
      { term: 'Mustache stripe', aka: 'malar stripe', definition: 'A stripe running down from the base of the bill along the side of the throat.' },
      { term: 'Bib', definition: 'A dark patch on the throat and upper chest, as on a chickadee or a male House Sparrow.' },
      { term: 'Crest', definition: 'Feathers on the crown that can be raised into a point, as on a Blue Jay, Tufted Titmouse, or Northern Cardinal.' },
      { term: 'Flanks', definition: 'The sides of the body, below the folded wing.' },
      { term: 'Wingbar', definition: 'A pale stripe across the folded wing, made by a row of pale feather tips. Many warblers and vireos have two.' },
      { term: 'Rump', definition: 'The lower back, just above the tail. Often hidden at rest and flashed in flight — think of a flicker\'s white rump.' },
      { term: 'Undertail', aka: 'undertail coverts', definition: 'The feathers covering the base of the tail from below. A catbird\'s is rusty; a Palm Warbler\'s is yellow.' },
      { term: 'Speculum', definition: 'A glossy, colored patch on a duck\'s wing — blue on a Mallard.' },
      { term: 'Conical bill', definition: 'A thick, cone-shaped bill built for cracking seeds, as on sparrows, finches, and cardinals.' },
    ],
  },
  {
    title: 'Behavior',
    terms: [
      { term: 'Dabbling duck', definition: 'A duck that feeds at the surface or tips tail-up, rather than diving — Mallard, Northern Shoveler, Wood Duck.' },
      { term: 'Diving duck', definition: 'A duck that dives underwater for food — Bufflehead, Ruddy Duck.' },
      { term: 'Sallying', definition: 'Flying out from a perch to catch an insect, then returning — classic flycatcher behavior.' },
      { term: 'Mixed flock', definition: 'Several species foraging together, especially in fall and winter. Chickadees and titmice are usually the core; kinglets, nuthatches, creepers, and woodpeckers tag along.' },
      { term: 'Mobbing', definition: 'Small birds gathering to scold a predator. Loud jays, crows, or chickadees often mean a hawk or owl is nearby.' },
      { term: 'Pishing', definition: 'Making a soft "pshh-pshh-pshh" sound to draw curious small birds into view. Use it sparingly, and not during nesting season.' },
    ],
  },
  {
    title: 'Seasons and movement',
    terms: [
      { term: 'Resident', definition: 'Present all year.' },
      { term: 'Migrant', definition: 'A bird passing through on its way between breeding and wintering grounds. Spring migration peaks in May; fall runs from late August into November.' },
      { term: 'Migrant trap', definition: 'A patch of green surrounded by unsuitable habitat, which concentrates tired migrants. Central Park is one of the best known in North America.' },
      { term: 'Fallout', definition: 'When weather forces large numbers of migrants to land at once. The morning after can fill the Ramble with warblers.' },
      { term: 'Irruption', definition: 'A year when a northern species moves south in large numbers, usually because its food failed up north. Red-breasted Nuthatches and Pine Siskins are irruptive.' },
    ],
  },
  {
    title: 'Birder talk',
    terms: [
      { term: 'Lifer', definition: 'A species you have seen for the first time ever.' },
      { term: 'FOY', aka: 'first of year', definition: 'Your first sighting of a species in the calendar year.' },
      { term: 'Banding code', aka: 'alpha code', definition: 'A four-letter abbreviation used as shorthand — AMRO for American Robin, NOCA for Northern Cardinal. You can type one into the guide\'s search.' },
      { term: 'Spuh', definition: 'An identification only to a group, like "warbler sp." — how eBird records a bird you saw but could not name.' },
      { term: 'Checklist', definition: 'In eBird, a list of the birds seen on one outing, with where, when, and how long you looked.' },
      { term: 'Taxonomic order', definition: 'The standard sequence field guides use, which keeps related birds together — ducks first, songbirds last.' },
    ],
  },
];
