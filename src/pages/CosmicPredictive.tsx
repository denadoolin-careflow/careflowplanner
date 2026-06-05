import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart } from "@/lib/cosmic/v2-hooks";
import { PredictiveSnapshotCard } from "@/components/cosmic/PredictiveSnapshotCard";
import { computeProgressions } from "@/lib/cosmic/astro/progressions";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { eclipseActivations, eclipsesBetween } from "@/lib/cosmic/astro/eclipses";

export default function CosmicPredictive() {
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? { date: row.birth_date, time: row.birth_time, tz: row.birth_tz, lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place, house_system: "whole-sign" } : null);

  if (!chart) {
    return (
      <div className="mx-auto max-w-md p-6 text-center space-y-3">
        <p className="text-muted-foreground">Add your birth info to view predictive techniques.</p>
        <Button asChild><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
      </div>
    );
  }
  const birthD = new Date(chart.birth.date);
  const today = new Date();
  const prog = computeProgressions(birthD, today);
  const prof = chart.houses ? computeProfection(birthD, chart.houses.ascendantSign, today) : null;
  const upcomingEclipses = eclipsesBetween(today, new Date(today.getTime() + 365 * 86400000));
  const eclipseActivationsList = eclipseActivations(chart.planets.map(p => p.longitude), today);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <h1 className="font-display text-xl">Predictive Astrology</h1>
        <div className="w-12" />
      </header>

      <PredictiveSnapshotCard chart={chart} />

      <section className="cozy-card p-5">
        <h3 className="font-display text-base">Secondary Progressions</h3>
        <p className="text-sm mt-1">Progressed Sun in <strong>{prog.progressedSun.sign}</strong>.</p>
        <p className="text-sm">Progressed Moon in <strong>{prog.progressedMoon.sign}</strong> — <em>{prog.progressedMoon.lunarPhase}</em> phase.</p>
        <p className="text-xs text-muted-foreground mt-2">Solar arc: {prog.solarArc.toFixed(1)}° from natal Sun.</p>
        <p className="text-[13px] text-muted-foreground italic mt-3">
          This progressed lunation phase invites an inner rhythm of {prog.progressedMoon.lunarPhase.toLowerCase()} — a slower, decade-long current beneath the daily transits.
        </p>
      </section>

      {prof && (
        <section className="cozy-card p-5">
          <h3 className="font-display text-base">Annual Profection (age {prof.age})</h3>
          <p className="text-sm mt-1">House {prof.house} · {prof.profectedSign} · time-lord <strong>{prof.timeLord}</strong></p>
          <p className="text-[13px] text-muted-foreground mt-1">This year highlights: {houseTopics(prof.house)}.</p>
          <p className="text-[12px] text-muted-foreground mt-2">{prof.yearStarts} → {prof.yearEnds}</p>
        </section>
      )}

      <section className="cozy-card p-5">
        <h3 className="font-display text-base">Eclipses (next 12 months)</h3>
        {upcomingEclipses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mt-1">No eclipses in the next year.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-[13px]">
            {upcomingEclipses.map(e => (
              <li key={e.date} className="flex justify-between gap-3">
                <span>{e.date} · {e.nature} {e.type}</span>
                <span className="text-muted-foreground">{e.degree}° {e.sign}</span>
              </li>
            ))}
          </ul>
        )}
        {eclipseActivationsList.length > 0 && (
          <p className="text-[12.5px] text-muted-foreground mt-3">
            {eclipseActivationsList.length} eclipse{eclipseActivationsList.length > 1 ? "s" : ""} activating points in your chart — this is often a season of meaningful transitions.
          </p>
        )}
      </section>
    </div>
  );
}