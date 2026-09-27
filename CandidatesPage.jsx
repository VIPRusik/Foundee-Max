import React, { useState } from 'react';
import { MaxUI, Panel, Button, Typography, Container, Flex } from '@maxhub/max-ui';

// 1. Импортируем массив из JSON-файла
import allCandidates from './data/candidates.json';

export default function CandidatesPage() {
  // Храним ID кандидатов, у которых телефон уже открыт
  const [visiblePhones, setVisiblePhones] = useState({});

  // 2. Берем строго первые 3 карточки кандидатов
  const displayedCandidates = allCandidates.slice(0, 3);

  const togglePhoneVisibility = (id) => {
    setVisiblePhones((prev) => ({
      ...prev,
      [id]: true
    }));
  };

  return (
    <MaxUI>
      <Container style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <Typography.Title level={1} style={{ marginBottom: '24px', textAlign: 'center' }}>
          Список кандидатов
        </Typography.Title>

        {/* Список карточек кандидатов */}
        <Flex direction="column" gap="16px">
          {displayedCandidates.map((candidate) => (
            <Panel key={candidate.id} style={{ padding: '20px', borderRadius: '12px' }}>
              <Flex direction="column" gap="8px">
                {/* Имя кандидата */}
                <Typography.Title level={3}>
                  {candidate.name}
                </Typography.Title>
                
                {/* Выводим параметры формату */}
                <Typography.Body>
                  <strong>Возраст:</strong> {candidate.age} {getAgeAddition(candidate.age)}
                </Typography.Body>
                
                <Typography.Body>
                  <strong>Опыт:</strong> {candidate.experience}
                </Typography.Body>
                
                <Typography.Body>
                  <strong>Город:</strong> {candidate.city}
                </Typography.Body>

                {/* 3. Кнопка «Показать телефон» вместо сразу видимого номера */}
                <Flex align="center" gap="12px" style={{ marginTop: '8px' }}>
                  <Typography.Body>
                    <strong>Телефон:</strong>{' '}
                    {visiblePhones[candidate.id] ? (
                      <span style={{ fontWeight: '600' }}>{candidate.phone}</span>
                    ) : (
                      '• •• ••• •• ••'
                    )}
                  </Typography.Body>

                  {!visiblePhones[candidate.id] && (
                    <Button 
                      size="small" 
                      variant="secondary"
                      onClick={() => togglePhoneVisibility(candidate.id)}
                    >
                      Показать телефон
                    </Button>
                  )}
                </Flex>
              </Flex>
            </Panel>
          ))}
        </Flex>
      </Container>
    </MaxUI>
  );
}

// Вспомогательная функция склонения возраста (год / года / лет)
function getAgeAddition(age) {
  const lastDigit = age % 10;
  const lastTwoDigits = age % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}
