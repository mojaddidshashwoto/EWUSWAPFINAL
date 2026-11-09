import { useState } from "react";
import { ArrowLeftRight, Camera, Check, Code2, Megaphone, Palette, PenTool, Repeat2, Video } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { motionEase } from "@/lib/motion";

const skillCategories = [
  { label: "Graphic Design", icon: Palette },
  { label: "Photography", icon: Camera },
  { label: "Programming", icon: Code2 },
  { label: "Video Editing", icon: Video },
  { label: "Marketing", icon: Megaphone },
  { label: "Business Strategy", icon: PenTool },
];

export function FloatingSkillCategories() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6" aria-label="Explore skill categories">
      {skillCategories.map(({ label, icon: Icon }, index) => (
        <motion.div
          key={label}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.35 + index * 0.06, ease: motionEase }}
          whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.025 }}
          className="skill-float-card flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[11px] font-semibold text-slate-300 shadow-sm backdrop-blur-md"
          style={{ animationDelay: shouldReduceMotion ? "0ms" : `${index * -420}ms` }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="truncate">{label}</span>
        </motion.div>
      ))}
    </div>
  );
}

interface SkillExchangeCardProps {
  name: string;
  role: string;
  offering: string;
  offeringIcon: typeof Palette;
  learning: string;
  learningIcon: typeof Camera;
  direction: "left" | "right";
  reducedMotion: boolean;
}

function SkillExchangeCard({
  name,
  role,
  offering,
  offeringIcon: OfferingIcon,
  learning,
  learningIcon: LearningIcon,
  direction,
  reducedMotion,
}: SkillExchangeCardProps) {
  const x = direction === "left" ? -24 : 24;
  const enteringSkillX = direction === "left" ? 22 : -22;

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, x }}
      whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reducedMotion ? 0 : 0.55, ease: motionEase }}
      className="w-full rounded-2xl border border-white/10 bg-slate-950/65 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-indigo-300/20 bg-indigo-400/10 text-sm font-bold text-indigo-200">
          {name.slice(0, 1)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: enteringSkillX }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.18, ease: motionEase }}
          className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] p-3"
        >
          <OfferingIcon className="h-4 w-4 text-emerald-300" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/70">Offers</p>
            <p className="truncate text-xs font-semibold text-slate-100">{offering}</p>
          </div>
        </motion.div>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -enteringSkillX }}
          whileInView={reducedMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.28, ease: motionEase }}
          className="flex items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-400/[0.07] p-3"
        >
          <LearningIcon className="h-4 w-4 text-indigo-300" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-300/70">Wants to learn</p>
            <p className="truncate text-xs font-semibold text-slate-100">{learning}</p>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

export function SkillExchangeAnimation() {
  const shouldReduceMotion = useReducedMotion();
  const [exchangeComplete, setExchangeComplete] = useState(false);

  return (
    <section className="px-4 py-16 sm:px-8 md:py-20" aria-labelledby="skill-exchange-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Skills move both ways</p>
          <h2 id="skill-exchange-title" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Learn together. Grow together.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Share what you know and learn something new from another student.
          </p>
        </div>

        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-5">
          <SkillExchangeCard
            name="Student A"
            role="Design enthusiast"
            offering="Graphic Design"
            offeringIcon={Palette}
            learning="Photography"
            learningIcon={Camera}
            direction="left"
            reducedMotion={!!shouldReduceMotion}
          />

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : 0.25, ease: motionEase }}
            className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-indigo-300/20 bg-indigo-400/10 text-indigo-200 md:h-14 md:w-14"
            aria-label="Exchange skills"
          >
            <motion.div
              animate={shouldReduceMotion ? undefined : { rotate: [0, 0, 180, 180] }}
              transition={{ duration: 1.8, times: [0, 0.32, 0.66, 1], ease: motionEase, onComplete: () => setExchangeComplete(true) }}
            >
              <Repeat2 className="h-5 w-5" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: exchangeComplete || shouldReduceMotion ? 1 : 0, scale: exchangeComplete || shouldReduceMotion ? 1 : 0.5 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: motionEase }}
              className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-slate-950"
            >
              <Check className="h-3 w-3" />
            </motion.span>
          </motion.div>

          <SkillExchangeCard
            name="Student B"
            role="Photography enthusiast"
            offering="Photography"
            offeringIcon={Camera}
            learning="Graphic Design"
            learningIcon={Palette}
            direction="right"
            reducedMotion={!!shouldReduceMotion}
          />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-emerald-300">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span>Knowledge shared. Everyone grows.</span>
        </div>
      </div>
    </section>
  );
}
