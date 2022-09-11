import {
  Application,
  Context,
  Router,
  RouterContext,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import * as yup from "https://cdn.skypack.dev/yup";

interface RequestError extends Error {
  status: number;
}

interface Dinosaur {
  id?: string;
  name: string;
  image: string;
}

const dinosaurSchema = yup.object().shape({
  name: yup.string().trim().min(2).required(),
  image: yup.string().trim().url().required(),
});

const app = new Application();
const router = new Router();

const DB = new Map<string, Dinosaur>();

router.get("/", (ctx: RouterContext<"/">) => {
  ctx.response.body = {
    message: "Hello World! 🦕",
  };
});

router.get("/dinosaurs", (ctx: RouterContext<"/dinosaurs">) => {
  ctx.response.body = [...DB.values()];
});

router.post("/dinosaurs", async (ctx: RouterContext<"/dinosaurs">) => {
  try {
    const body = await ctx.request.body();
    if (body.type !== "json") throw new Error("Invalid Body");
    const dinosaur = (await dinosaurSchema.validate(
      await body.value
    )) as Dinosaur;
    dinosaur.id = String(crypto.randomUUID());
    DB.set(dinosaur.id, dinosaur);
    ctx.response.body = dinosaur;
  } catch (error) {
    error.status = 422;
    throw error;
  }
});

router.delete("/dinosaurs/:id", (ctx: RouterContext<"/dinosaurs/:id">) => {
  const { id } = ctx.params;
  if (id && DB.has(id)) {
    ctx.response.status = 204;
    DB.delete(id);
  } else {
    const error = new Error("Not Found! 🦕") as RequestError;
    error.status = 404;
    throw error;
  }
});

app.use(async (ctx: Context, next: () => Promise<unknown>) => {
  try {
    await next();
  } catch (err) {
    const error = err as RequestError;
    ctx.response.status = error.status || 500;
    ctx.response.body = {
      message: error.message,
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(`Listening on ${hostname}:${port}`);
});

await app.listen({ port: 3000 });
