import React, { useState } from 'react';
import { Panel, Button, Typography, Container, Flex } from '@maxhub/max-ui';

// Бот передаёт найденные карточки в параметре `data`: JSON в base64url.
// Формат задаётся в src/miniapp.js бота.
function readPayload() {
  const raw = new URLSearchParams(window.location.search).get('data');
  if (!raw) return null;
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(payload.items) ? payload : null;
  } catch {
    return null;
  }
}

function ageWord(age) {
  const last = age % 10;
  const lastTwo = age % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <Typography.Body>
      <strong>{label}:</strong> {value}
    </Typography.Body>
  );
}

function PhoneReveal({ phone }) {
  const [visible, setVisible] = useState(false);
  return (
    <Flex align="center" gap="12px" style={{ marginTop: '8px' }}>
      <Typography.Body>
        <strong>Телефон:</strong>{' '}
        {visible ? <span style={{ fontWeight: 600 }}>{phone}</span> : '• •• ••• •• ••'}
      </Typography.Body>
      {!visible && (
        <Button size="small" variant="secondary" onClick={() => setVisible(true)}>
          Показать телефон
        </Button>
      )}
    </Flex>
  );
}

function CandidateCard({ item }) {
  return (
    <>
      <Typography.Title level={3}>{item.n}</Typography.Title>
      <Field label="Возраст" value={`${item.a} ${ageWord(item.a)}`} />
      <Field label="Опыт" value={item.e} />
      <Field label="Город" value={item.c} />
      <Field label="Занятость" value={item.m} />
      <PhoneReveal phone={item.p} />
    </>
  );
}

function VacancyCard({ item }) {
  return (
    <>
      <Typography.Title level={3}>{item.t}</Typography.Title>
      <Field label="Город" value={item.c} />
      <Field label="Занятость" value={item.m} />
      <Field label="Оплата" value={item.s || 'не указана'} />
      {item.d === 1 && <Typography.Body style={{ opacity: 0.6 }}>Демо-вакансия (тестовые данные)</Typography.Body>}
      <PhoneReveal phone={item.p} />
    </>
  );
}

const PAGES = {
  candidates: { title: 'Подходящие кандидаты', note: 'Кандидаты — тестовые данные MVP.', Card: CandidateCard },
  vacancies: { title: 'Подходящие вакансии', note: null, Card: VacancyCard },
};

export default function ResultsPage() {
  const payload = readPayload();
  const page = payload && PAGES[payload.kind];

  if (!page || payload.items.length === 0) {
    return (
      <Container style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <Typography.Title level={2}>Список пуст</Typography.Title>
        <Typography.Body>Откройте мини-приложение кнопкой «Открыть карточками» в чате с ботом Foundee-Max.</Typography.Body>
      </Container>
    );
  }

  const { title, note, Card } = page;
  return (
    <Container style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Typography.Title level={1} style={{ marginBottom: '24px', textAlign: 'center' }}>
        {title}
      </Typography.Title>

      <Flex direction="column" gap="16px">
        {payload.items.map((item, index) => (
          <Panel key={index} style={{ padding: '20px', borderRadius: '12px' }}>
            <Flex direction="column" gap="8px">
              <Card item={item} />
            </Flex>
          </Panel>
        ))}
      </Flex>

      {note && (
        <Typography.Body style={{ marginTop: '16px', textAlign: 'center', opacity: 0.6 }}>{note}</Typography.Body>
      )}
    </Container>
  );
}
