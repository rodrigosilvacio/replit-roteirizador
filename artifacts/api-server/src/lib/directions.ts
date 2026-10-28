type Step = {
  name?: string;
  ref?: string;
  destinations?: string;
  maneuver: { type: string; modifier?: string; exit?: number };
};

export function instruction(step: Step): string {
  const { type, modifier, exit } = step.maneuver;
  const directions: Record<string, string> = {
    left: "à esquerda", right: "à direita",
    "slight left": "levemente à esquerda", "slight right": "levemente à direita",
    "sharp left": "acentuadamente à esquerda", "sharp right": "acentuadamente à direita",
    straight: "em frente", uturn: "fazendo o retorno",
  };
  const direction = directions[modifier ?? ""] ?? "em frente";
  const road = step.name || step.ref;
  const along = road ? ` pela via ${road}` : "";
  let action: string;
  switch (type) {
    case "depart": action = `Inicie o trajeto${along}`; break;
    case "arrive": return "Chegue ao destino deste trecho";
    case "roundabout": case "rotary":
      action = exit ? `Na rotatória, pegue a ${exit}ª saída${along}` : `Entre na rotatória${along}`; break;
    case "exit roundabout": case "exit rotary": action = `Saia da rotatória${along}`; break;
    case "roundabout turn": action = `Na rotatória, siga ${direction}${along}`; break;
    case "merge": action = `Entre na via ${direction}${along}`; break;
    case "on ramp": action = `Pegue o acesso ${direction}${along}`; break;
    case "off ramp": action = `Pegue a saída ${direction}${along}`; break;
    case "fork": action = `Na bifurcação, mantenha-se ${direction}${along}`; break;
    case "end of road": action = `No fim da via, vire ${direction}${along}`; break;
    case "turn":
      action = modifier === "uturn" ? `Faça o retorno${along}` : `Vire ${direction}${along}`; break;
    default: action = modifier === "uturn" ? `Faça o retorno${along}` : `Continue ${direction}${along}`;
  }
  return action + (step.destinations ? `, sentido ${step.destinations}` : "");
}
