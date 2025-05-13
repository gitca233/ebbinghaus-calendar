import { Router } from 'itty-router';
import { ICalCalendar } from 'ical-generator';
import xlsx from 'xlsx';

const router = Router();
let TEMP_DATA = {};
let PLAN_ID = 0;
const PLANS = new Map();

router.get('/api/plans', () =>
  Response.json(Array.from(PLANS.entries()).map(([id, plan]) => ({ id, name: plan.name })))
);

router.post('/api/plans/upload', async (req) => {
  const form = await req.formData();
  const file = form.get('file');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = xlsx.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(sheet);
  TEMP_DATA = json;
  return Response.json({ preview: json.map((r) => `${r.name} (${r.date})`) });
});

router.post('/api/plans/confirm', async () => {
  PLAN_ID++;
  PLANS.set(PLAN_ID, { name: `学习计划${PLAN_ID}`, records: TEMP_DATA });
  TEMP_DATA = {};
  return new Response('ok');
});

router.get('/api/plans/:id/ical', (req) => {
  const id = parseInt(req.params.id);
  const plan = PLANS.get(id);
  if (!plan) return new Response('Not found', { status: 404 });

  const calendar = new ICalCalendar({ name: plan.name });
  const days = [0, 1, 2, 4, 7, 15, 30];

  for (const row of plan.records) {
    for (const d of days) {
      const start = new Date(row.date);
      start.setDate(start.getDate() + d);
      calendar.createEvent({
        start,
        end: new Date(start.getTime() + 30 * 60 * 1000),
        summary: `复习：${row.name}`,
      });
    }
  }

  return new Response(calendar.toString(), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
});

export async function onRequest(context) {
  return router.handle(context.request);
}
