const POLL_MS = 16;
/** Teto da espera assíncrona: passou disso, a leitura de status final (que bloqueia) resolve. */
const MAX_WAIT_MS = 5000;

export type ProgramSource = {
  vertex: string;
  fragment: string;
  /** Atributos na ordem dos índices usados no vertexAttribPointer. */
  attribs: string[];
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Compila e linka sem travar a thread principal. Ler COMPILE_STATUS/LINK_STATUS bloqueia até o
 * driver terminar (medido: 550–1400 ms sem cache de shader, ou seja, em todo visitante novo).
 * Com KHR_parallel_shader_compile dá para perguntar se terminou sem esperar.
 *
 * `done` roda sempre depois do retorno, com os programas na ordem de `sources` (null se falhou).
 * Retorna a função que cancela e libera tudo.
 */
export function linkPrograms(
  gl: WebGLRenderingContext,
  label: string,
  sources: ProgramSource[],
  done: (programs: WebGLProgram[] | null) => void,
): () => void {
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const started = performance.now();
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  let timer = 0;

  const release = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    shaders.length = 0;
  };

  let complete = true;
  for (const { vertex, fragment, attribs } of sources) {
    const vs = compile(gl, gl.VERTEX_SHADER, vertex);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (vs) shaders.push(vs);
    if (fs) shaders.push(fs);
    if (!vs || !fs || !program) {
      complete = false;
      break;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    attribs.forEach((name, index) => gl.bindAttribLocation(program, index, name));
    gl.linkProgram(program);
    programs.push(program);
  }

  const finish = () => {
    const failed = !complete || programs.some((program) => !gl.getProgramParameter(program, gl.LINK_STATUS));
    if (failed) {
      shaders.forEach((shader) => {
        const log = gl.getShaderInfoLog(shader);
        if (log) console.error(`[${label}] shader:`, log);
      });
      programs.forEach((program) => {
        const log = gl.getProgramInfoLog(program);
        if (log) console.error(`[${label}] link:`, log);
        gl.deleteProgram(program);
      });
      programs.length = 0;
    }
    release();
    done(failed ? null : programs);
  };

  const poll = () => {
    const pending =
      complete &&
      parallel &&
      performance.now() - started < MAX_WAIT_MS &&
      programs.some((program) => !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR));
    if (pending) timer = window.setTimeout(poll, POLL_MS);
    else finish();
  };
  timer = window.setTimeout(poll, POLL_MS);

  return () => {
    window.clearTimeout(timer);
    programs.forEach((program) => gl.deleteProgram(program));
    programs.length = 0;
    release();
  };
}
