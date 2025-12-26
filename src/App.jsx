import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, Text, TextInput, Textarea, Select, Grid, 
  Stack, Group, Badge, Table, LoadingOverlay, PasswordInput, MultiSelect, Modal, Code, SimpleGrid, Tabs
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

const API_BASE = 'http://localhost:3000/api';

const NewsletterEngine = () => {
  const [user, setUser] = useState(null);
  const [newsletters, setNewsletters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    campaigns: false,
    subscribers: false,
    stats: false,
    login: false,
    register: false
  });

  const login = async (e) => {
    e.preventDefault();
    setLoadingStates(prev => ({ ...prev, login: true }));
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('token', data.token);
        notifications.show({ title: 'Klart!', message: 'Inloggad', color: 'green' });
      } else {
        notifications.show({ title: 'Fel', message: data.error || 'Inloggning misslyckades', color: 'red' });
      }
    } catch (error) {
      notifications.show({ title: 'Fel', message: 'Inloggning misslyckades', color: 'red' });
    } finally {
      setLoadingStates(prev => ({ ...prev, login: false }));
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setLoadingStates(prev => ({ ...prev, register: true }));
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: registerEmail, 
          password: registerPassword,
          name: registerName 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('token', data.token);
        notifications.show({ title: 'Klart!', message: 'Konto skapat och inloggad', color: 'green' });
      } else {
        notifications.show({ title: 'Fel', message: data.error || 'Registrering misslyckades', color: 'red' });
      }
    } catch (error) {
      notifications.show({ title: 'Fel', message: 'Registrering misslyckades', color: 'red' });
    } finally {
      setLoadingStates(prev => ({ ...prev, register: false }));
    }
  };

  // Fetch data
  useEffect(() => {
    if (user) {
      fetchNewsletters();
      fetchCampaigns();
      fetchStats();
    }
  }, [user]);

  const fetchNewsletters = async () => {
    try {
      const response = await fetch(`${API_BASE}/newsletters`);
      if (!response.ok) throw new Error('Failed to fetch newsletters');
      const data = await response.json();
      setNewsletters(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    }
  };

  const fetchCampaigns = async () => {
    setLoadingStates(prev => ({ ...prev, campaigns: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, campaigns: false }));
    }
  };

  const fetchStats = async () => {
    setLoadingStates(prev => ({ ...prev, stats: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, stats: false }));
    }
  };

  // Login/Register form
  if (!user) {
    return (
      <Box style={{ maxWidth: 1200, margin: '50px auto', padding: '0 20px' }}>
        <Grid>
          {/* Left side - Features and Pricing Info */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="xl">
              <Box>
                <Text size="2.5rem" fw={700} mb="sm" style={{ color: '#1971c2' }}>
                  ebrevsmotor
                </Text>
                <Text size="xl" c="dimmed" mb="xl">
                  Din kompletta marknadsföringsplattform för e-post, SMS och automation
                </Text>
              </Box>

              {/* Features Section */}
              <Card shadow="sm" padding="lg" withBorder>
                <Text size="lg" fw={700} mb="md">✨ Alla funktioner inkluderade:</Text>
                <Stack gap="md">
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">📧</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>E-postkampanjer</Text>
                      <Text size="sm" c="dimmed">Skapa och skicka professionella nyhetsbrev med vår visuella editor</Text>
                    </Box>
                  </Group>
                  
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">📱</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>SMS-kampanjer</Text>
                      <Text size="sm" c="dimmed">Nå dina kunder direkt via SMS med personliga meddelanden</Text>
                    </Box>
                  </Group>
                  
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">🎯</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>Landningssidor</Text>
                      <Text size="sm" c="dimmed">Bygg konverterande landningssidor utan kodning</Text>
                    </Box>
                  </Group>
                  
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">⚡</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>Automation</Text>
                      <Text size="sm" c="dimmed">Automatisera dina kampanjer med smarta flöden och triggers</Text>
                    </Box>
                  </Group>
                  
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">📋</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>Enkäter & Formulär</Text>
                      <Text size="sm" c="dimmed">Samla in feedback och data från dina kunder</Text>
                    </Box>
                  </Group>
                  
                  <Group gap="sm" align="flex-start">
                    <Text size="xl">📊</Text>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600}>Avancerad Analys</Text>
                      <Text size="sm" c="dimmed">Följ öppningar, klick och konverteringar i realtid</Text>
                    </Box>
                  </Group>
                </Stack>
              </Card>

              {/* Pricing Section */}
              <Card shadow="md" padding="xl" withBorder style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Stack gap="md">
                  <Text size="xl" fw={700}>💰 Introduktionspris</Text>
                  <Group align="baseline" gap="xs">
                    <Text size="3rem" fw={700}>299 kr</Text>
                    <Text size="lg">/månad</Text>
                  </Group>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="lg">✓</Text>
                      <Text>Alla funktioner inkluderade</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="lg">✓</Text>
                      <Text>Upp till 5 000 prenumeranter</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="lg">✓</Text>
                      <Text>Obegränsade kampanjer</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="lg">✓</Text>
                      <Text>Prioriterad support</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="lg">✓</Text>
                      <Text>30 dagars gratis provperiod</Text>
                    </Group>
                  </Stack>
                  <Text size="sm" style={{ opacity: 0.9 }}>
                    * Ingen bindningstid. Avsluta när du vill.
                  </Text>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Right side - Login/Register Form */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" padding="lg" style={{ position: 'sticky', top: '20px' }}>
              <Text size="xl" fw={700} ta="center" mb="md">
                {isRegistering ? 'Kom igång gratis' : 'Välkommen tillbaka'}
              </Text>
              
              {!isRegistering ? (
                // Login Form
                <form onSubmit={login}>
                  <Stack gap="md">
                    <TextInput
                      label="Email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    <PasswordInput
                      label="Lösenord"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" fullWidth loading={loadingStates.login}>
                      Logga in
                    </Button>
                    <Text size="sm" ta="center" c="dimmed">
                      Har du inget konto?{' '}
                      <Text 
                        component="span" 
                        c="blue" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIsRegistering(true)}
                      >
                        Registrera dig här
                      </Text>
                    </Text>
                  </Stack>
                </form>
              ) : (
                // Register Form
                <form onSubmit={register}>
                  <Stack gap="md">
                    <Badge size="lg" variant="light" color="green" fullWidth style={{ padding: '10px' }}>
                      🎉 30 dagar gratis - ingen betalning krävs nu
                    </Badge>
                    
                    <TextInput
                      label="Företagsnamn"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      placeholder="Ditt företag AB"
                    />
                    <TextInput
                      label="Email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      placeholder="din@email.se"
                    />
                    <PasswordInput
                      label="Lösenord"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      description="Minst 6 tecken"
                    />
                    
                    <Box style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                      <Text size="sm" fw={600} mb="xs">Efter provperioden:</Text>
                      <Text size="sm" c="dimmed">299 kr/månad - avsluta när du vill</Text>
                    </Box>
                    
                    <Button type="submit" fullWidth loading={loadingStates.register} size="md">
                      Starta gratis provperiod
                    </Button>
                    
                    <Text size="sm" ta="center" c="dimmed">
                      Har du redan ett konto?{' '}
                      <Text 
                        component="span" 
                        c="blue" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIsRegistering(false)}
                      >
                        Logga in här
                      </Text>
                    </Text>
                  </Stack>
                </form>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Box>
    );
  }

  return (
    <Box p="md">
      <Group justify="space-between" mb="xl">
        <Text size="xl" fw={700}>
          Newsletter Engine - {user.name || user.email}
        </Text>
        <Button variant="outline" onClick={() => {
          setUser(null);
          localStorage.removeItem('token');
        }}>
          Logout
        </Button>
      </Group>

      <Group mb="md">
        {['dashboard', 'campaigns', 'sms', 'landing-pages', 'automation', 'surveys', 'subscribers', 'create'].map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'filled' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dashboard' ? '📊 Översikt' : 
             tab === 'campaigns' ? '📧 Kampanjer' :
             tab === 'sms' ? '📱 SMS' :
             tab === 'landing-pages' ? '🎯 Landningssidor' :
             tab === 'automation' ? '⚡ Automation' :
             tab === 'surveys' ? '📋 Enkäter' :
             tab === 'subscribers' ? '👥 Prenumeranter' :
             tab === 'create' ? '✨ Skapa Ny' : tab}
          </Button>
        ))}
      </Group>

      {activeTab === 'dashboard' && <Dashboard stats={stats} newsletters={newsletters} loading={loadingStates.stats} />}
      {activeTab === 'campaigns' && <Campaigns campaigns={campaigns} onSendCampaign={fetchCampaigns} loading={loadingStates.campaigns} />}
      {activeTab === 'sms' && <SMSCampaigns newsletters={newsletters} />}
      {activeTab === 'landing-pages' && <LandingPages newsletters={newsletters} />}
      {activeTab === 'automation' && <AutomationFlows newsletters={newsletters} />}
      {activeTab === 'surveys' && <Surveys newsletters={newsletters} />}
      {activeTab === 'create' && <CreateCampaignWithBuilder newsletters={newsletters} onCreate={fetchCampaigns} />}
      {activeTab === 'subscribers' && <SubscriberForm newsletters={newsletters} />}
    </Box>
  );
};

// Stat Card Component
const StatCard = ({ title, value, trend, icon }) => {
  return (
    <Card shadow="sm" padding="lg" style={{ height: '100%' }}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">{title}</Text>
          {icon && <Text size="xl">{icon}</Text>}
        </Group>
        <Text size="xl" fw={700}>{value}</Text>
        {trend && (
          <Text size="xs" c={trend > 0 ? 'green' : trend < 0 ? 'red' : 'gray'}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </Text>
        )}
      </Stack>
    </Card>
  );
};

// Dashboard Component
const Dashboard = ({ stats, newsletters, loading }) => {
  if (loading || !stats) return <LoadingOverlay visible />;

  // Calculate additional stats
  const totalCampaigns = stats.campaignStats?.reduce((sum, item) => sum + item.campaign_count, 0) || 0;
  const activeCampaigns = totalCampaigns; // Could filter by status if needed

  return (
    <Stack gap="md">
      <Text size="lg" fw={700}>Dashboard Overview</Text>
      
      {/* Top Stats Row */}
      <Grid>
        <Grid.Col span={3}>
          <StatCard 
            title="Totala Prenumeranter" 
            value={stats.totalSubscribers}
            icon="👥"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <StatCard 
            title="Nyhetsbrev" 
            value={newsletters.length}
            icon="📧"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <StatCard 
            title="Totala Kampanjer" 
            value={totalCampaigns}
            icon="📨"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <StatCard 
            title="Aktiva Kampanjer" 
            value={activeCampaigns}
            icon="🚀"
          />
        </Grid.Col>
      </Grid>
      
      {/* Subscribers by Newsletter */}
      <Card shadow="sm" padding="lg">
        <Text fw={700} mb="md">📊 Subscribers by Newsletter</Text>
        <Stack gap="sm">
          {stats.newsletterStats?.map(item => (
            <Group key={item.name} justify="space-between">
              <Text>{item.name}</Text>
              <Badge size="lg" variant="filled">{item.count}</Badge>
            </Group>
          ))}
        </Stack>
      </Card>
      
      {/* Campaign Stats */}
      <Card shadow="sm" padding="lg">
        <Text fw={700} mb="md">📈 Campaigns by Newsletter</Text>
        <Stack gap="sm">
          {stats.campaignStats?.map(item => (
            <Group key={item.name} justify="space-between">
              <Text>{item.name}</Text>
              <Badge size="lg" variant="outline">{item.campaign_count} campaigns</Badge>
            </Group>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
};

// Campaigns List Component
const Campaigns = ({ campaigns, onSendCampaign, loading }) => {
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.newsletter_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sendCampaign = async (campaignId) => {
    setSendingId(campaignId);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to send campaign');
      const data = await response.json();
      notifications.show({ 
        title: 'Campaign Sent', 
        message: data.message, 
        color: 'green' 
      });
      onSendCampaign();
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message || 'Failed to send campaign', 
        color: 'red' 
      });
    } finally {
      setSendingId(null);
    }
  };

  const viewCampaign = async (campaign) => {
    setPreviewCampaign(campaign);
    setShowPreview(true);
    
    // Fetch stats if campaign is sent
    if (campaign.status === 'sent') {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_BASE}/campaigns/${campaign.id}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await response.json();
        setCampaignStats(stats);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    } else {
      setCampaignStats(null);
    }
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={700}>Campaigns</Text>
          <Badge size="lg">{filteredCampaigns.length} campaigns</Badge>
        </Group>
        
        {/* Search and Filter */}
        <Group>
          <TextInput
            placeholder="Search by subject or newsletter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
            leftSection="🔍"
          />
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' }
            ]}
            style={{ width: 200 }}
          />
        </Group>
        
        <Table>
          <thead>
            <tr>
              <th>Newsletter</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  <Text c="dimmed">No campaigns found</Text>
                </td>
              </tr>
            ) : (
              filteredCampaigns.map(campaign => (
              <tr key={campaign.id}>
                <td>{campaign.newsletter_name}</td>
                <td>{campaign.subject}</td>
                <td>
                  <Badge color={campaign.status === 'sent' ? 'green' : 'blue'}>
                    {campaign.status}
                  </Badge>
                </td>
                <td>{new Date(campaign.created_at).toLocaleDateString()}</td>
                <td>
                  <Group gap="xs">
                    <Button size="xs" variant="light" onClick={() => viewCampaign(campaign)}>
                      View
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button 
                        size="xs" 
                        onClick={() => sendCampaign(campaign.id)}
                        loading={sendingId === campaign.id}
                      >
                        Send
                      </Button>
                    )}
                  </Group>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </Table>
      </Stack>

      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Preview: ${previewCampaign?.subject}`}
        size="xl"
      >
        {previewCampaign && (
          <Stack gap="md">
            <Box>
              <Text fw={700} mb="xs">Newsletter:</Text>
              <Text>{previewCampaign.newsletter_name}</Text>
            </Box>
            
            <Box>
              <Text fw={700} mb="xs">Subject:</Text>
              <Text>{previewCampaign.subject}</Text>
            </Box>
            
            <Box>
              <Text fw={700} mb="xs">Status:</Text>
              <Badge color={previewCampaign.status === 'sent' ? 'green' : 'blue'}>
                {previewCampaign.status}
              </Badge>
            </Box>

            {previewCampaign.sent_at && (
              <Box>
                <Text fw={700} mb="xs">Sent at:</Text>
                <Text>{new Date(previewCampaign.sent_at).toLocaleString()}</Text>
              </Box>
            )}

            {campaignStats && (
              <CampaignAnalytics campaignId={previewCampaign.id} campaignStats={campaignStats} />
            )}
            
            <Box>
              <Text fw={700} mb="xs">HTML Preview:</Text>
              <Card withBorder padding="md" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: previewCampaign.content_html }} />
              </Card>
            </Box>
            
            <Box>
              <Text fw={700} mb="xs">Text Content:</Text>
              <Textarea
                value={previewCampaign.content_text}
                readOnly
                minRows={6}
                styles={{ input: { fontFamily: 'monospace' } }}
              />
            </Box>
          </Stack>
        )}
      </Modal>
    </>
  );
};

// Campaign Analytics Component
const CampaignAnalytics = ({ campaignId, campaignStats }) => {
  if (!campaignStats) {
    return (
      <Card padding="lg" withBorder>
        <Text c="dimmed">Ingen statistik tillgänglig än</Text>
      </Card>
    );
  }

  const openRate = campaignStats.emails_sent > 0 
    ? ((campaignStats.opens / campaignStats.emails_sent) * 100).toFixed(1)
    : 0;
  
  const clickRate = campaignStats.emails_sent > 0
    ? ((campaignStats.clicks / campaignStats.emails_sent) * 100).toFixed(1)
    : 0;

  return (
    <Card padding="lg" withBorder>
      <Text fw={700} mb="md">📊 Kampanjanalys</Text>
      
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Översikt</Tabs.Tab>
          <Tabs.Tab value="performance">Prestanda</Tabs.Tab>
          <Tabs.Tab value="engagement">Engagemang</Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            <SimpleGrid cols={2}>
              <Box>
                <Text size="xl" fw={700} c="blue">{campaignStats.emails_sent}</Text>
                <Text size="sm" c="dimmed">Skickade e-post</Text>
              </Box>
              <Box>
                <Text size="xl" fw={700} c="red">{campaignStats.bounces}</Text>
                <Text size="sm" c="dimmed">Bounces</Text>
              </Box>
            </SimpleGrid>
            
            <Text size="sm" c="dimmed">
              Leveransgrad: {((campaignStats.emails_sent - campaignStats.bounces) / campaignStats.emails_sent * 100).toFixed(1)}%
            </Text>
          </Stack>
        </Tabs.Panel>
        
        <Tabs.Panel value="performance" pt="md">
          <Stack gap="md">
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Öppningsfrekvens</Text>
                <Text size="sm" fw={600}>{openRate}%</Text>
              </Group>
              <Box style={{ backgroundColor: '#e9ecef', borderRadius: '4px', height: '8px' }}>
                <Box style={{ 
                  backgroundColor: '#51cf66', 
                  borderRadius: '4px', 
                  height: '8px',
                  width: `${openRate}%`,
                  transition: 'width 0.3s'
                }} />
              </Box>
            </Box>
            
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Klickfrekvens</Text>
                <Text size="sm" fw={600}>{clickRate}%</Text>
              </Group>
              <Box style={{ backgroundColor: '#e9ecef', borderRadius: '4px', height: '8px' }}>
                <Box style={{ 
                  backgroundColor: '#ff6b6b', 
                  borderRadius: '4px', 
                  height: '8px',
                  width: `${clickRate}%`,
                  transition: 'width 0.3s'
                }} />
              </Box>
            </Box>
          </Stack>
        </Tabs.Panel>
        
        <Tabs.Panel value="engagement" pt="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text>Totala öppningar</Text>
              <Badge size="lg">{campaignStats.opens}</Badge>
            </Group>
            <Group justify="space-between">
              <Text>Totala klick</Text>
              <Badge size="lg">{campaignStats.clicks}</Badge>
            </Group>
            <Group justify="space-between">
              <Text>Klick per öppning</Text>
              <Badge size="lg">
                {campaignStats.opens > 0 
                  ? ((campaignStats.clicks / campaignStats.opens) * 100).toFixed(1) 
                  : 0}%
              </Badge>
            </Group>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};

// Template Card Component
const TemplateCard = ({ template, onApply }) => {
  return (
    <Card shadow="sm" padding="md" withBorder style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={onApply}>
      <Stack gap="xs">
        <Text fw={600}>{template.name}</Text>
        <Text size="sm" c="dimmed" lineClamp={2}>{template.subject}</Text>
        <Button size="xs" variant="light" fullWidth>
          Använd mall
        </Button>
      </Stack>
    </Card>
  );
};

// Email Templates Component
const EmailTemplates = ({ onApplyTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/templates`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay visible />;

  return (
    <Card padding="lg" withBorder>
      <Text fw={700} mb="md">📝 E-postmallar</Text>
      <SimpleGrid cols={2}>
        {templates.map(template => (
          <TemplateCard 
            key={template.id}
            template={template}
            onApply={() => onApplyTemplate(template)}
          />
        ))}
      </SimpleGrid>
    </Card>
  );
};

// Email Block Builder Component
const EmailBlockBuilder = ({ onHtmlGenerated }) => {
  const [blocks, setBlocks] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const blockTypes = [
    { type: 'heading', label: '📝 Heading', icon: 'H' },
    { type: 'text', label: '📄 Text', icon: 'T' },
    { type: 'button', label: '🔘 Button', icon: 'B' },
    { type: 'image', label: '🖼️ Image', icon: 'I' },
    { type: 'divider', label: '➖ Divider', icon: '—' },
    { type: 'spacer', label: '⬜ Spacer', icon: 'S' }
  ];

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: getDefaultContent(type)
    };
    setBlocks([...blocks, newBlock]);
  };

  const getDefaultContent = (type) => {
    switch (type) {
      case 'heading':
        return { text: 'Your Heading Here', level: 'h2', color: '#2c3e50' };
      case 'text':
        return { text: 'Your text content here...', color: '#555' };
      case 'button':
        return { text: 'Click Here', url: 'https://example.com', bgColor: '#007bff', textColor: '#ffffff' };
      case 'image':
        return { url: 'https://via.placeholder.com/600x300', alt: 'Image', width: '100%' };
      case 'divider':
        return { color: '#e0e0e0', height: '2px' };
      case 'spacer':
        return { height: '30px' };
      default:
        return {};
    }
  };

  const updateBlock = (id, content) => {
    setBlocks(blocks.map(block => block.id === id ? { ...block, content } : block));
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(b => b.id === id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < blocks.length - 1)) {
      const newBlocks = [...blocks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  const generateHTML = () => {
    let html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">';
    
    blocks.forEach(block => {
      switch (block.type) {
        case 'heading':
          html += `<${block.content.level} style="color: ${block.content.color}; margin: 20px 0 10px 0;">${block.content.text}</${block.content.level}>`;
          break;
        case 'text':
          html += `<p style="color: ${block.content.color}; line-height: 1.6; margin: 10px 0;">${block.content.text}</p>`;
          break;
        case 'button':
          html += `<div style="text-align: center; margin: 20px 0;"><a href="${block.content.url}" style="display: inline-block; padding: 12px 30px; background-color: ${block.content.bgColor}; color: ${block.content.textColor}; text-decoration: none; border-radius: 5px; font-weight: bold;">${block.content.text}</a></div>`;
          break;
        case 'image':
          html += `<img src="${block.content.url}" alt="${block.content.alt}" style="width: ${block.content.width}; height: auto; display: block; margin: 15px 0;" />`;
          break;
        case 'divider':
          html += `<hr style="border: none; border-top: ${block.content.height} solid ${block.content.color}; margin: 20px 0;" />`;
          break;
        case 'spacer':
          html += `<div style="height: ${block.content.height};"></div>`;
          break;
      }
    });
    
    html += '</div>';
    onHtmlGenerated(html);
    return html;
  };

  useEffect(() => {
    if (blocks.length > 0) {
      generateHTML();
    }
  }, [blocks]);

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Text fw={600}>Email Builder</Text>
        <Button size="xs" variant="light" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </Group>

      <Grid>
        <Grid.Col span={showPreview ? 6 : 12}>
          <Card padding="md" withBorder mb="md">
            <Text size="sm" fw={600} mb="sm">Add Blocks:</Text>
            <Group gap="xs">
              {blockTypes.map(bt => (
                <Button
                  key={bt.type}
                  size="xs"
                  variant="light"
                  onClick={() => addBlock(bt.type)}
                >
                  {bt.label}
                </Button>
              ))}
            </Group>
          </Card>

          <Stack gap="sm">
            {blocks.length === 0 ? (
              <Card padding="lg" withBorder>
                <Text c="dimmed" ta="center">
                  Click buttons above to add blocks to your email
                </Text>
              </Card>
            ) : (
              blocks.map((block, index) => (
                <Card key={block.id} padding="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <Badge>{block.type}</Badge>
                    <Group gap="xs">
                      <Button size="xs" variant="subtle" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>↑</Button>
                      <Button size="xs" variant="subtle" onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1}>↓</Button>
                      <Button size="xs" color="red" variant="subtle" onClick={() => removeBlock(block.id)}>✕</Button>
                    </Group>
                  </Group>

                  {block.type === 'heading' && (
                    <Stack gap="xs">
                      <TextInput
                        size="sm"
                        value={block.content.text}
                        onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                      />
                      <Group>
                        <Select
                          size="xs"
                          data={[
                            { value: 'h1', label: 'H1' },
                            { value: 'h2', label: 'H2' },
                            { value: 'h3', label: 'H3' }
                          ]}
                          value={block.content.level}
                          onChange={(val) => updateBlock(block.id, { ...block.content, level: val })}
                        />
                        <TextInput
                          size="xs"
                          placeholder="Color"
                          value={block.content.color}
                          onChange={(e) => updateBlock(block.id, { ...block.content, color: e.target.value })}
                        />
                      </Group>
                    </Stack>
                  )}

                  {block.type === 'text' && (
                    <Stack gap="xs">
                      <Textarea
                        size="sm"
                        value={block.content.text}
                        onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                        minRows={2}
                      />
                      <TextInput
                        size="xs"
                        placeholder="Color"
                        value={block.content.color}
                        onChange={(e) => updateBlock(block.id, { ...block.content, color: e.target.value })}
                      />
                    </Stack>
                  )}

                  {block.type === 'button' && (
                    <Stack gap="xs">
                      <TextInput
                        size="sm"
                        placeholder="Button text"
                        value={block.content.text}
                        onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                      />
                      <TextInput
                        size="sm"
                        placeholder="URL"
                        value={block.content.url}
                        onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                      />
                      <Group>
                        <TextInput
                          size="xs"
                          placeholder="BG Color"
                          value={block.content.bgColor}
                          onChange={(e) => updateBlock(block.id, { ...block.content, bgColor: e.target.value })}
                        />
                        <TextInput
                          size="xs"
                          placeholder="Text Color"
                          value={block.content.textColor}
                          onChange={(e) => updateBlock(block.id, { ...block.content, textColor: e.target.value })}
                        />
                      </Group>
                    </Stack>
                  )}

                  {block.type === 'image' && (
                    <Stack gap="xs">
                      <TextInput
                        size="sm"
                        placeholder="Image URL"
                        value={block.content.url}
                        onChange={(e) => updateBlock(block.id, { ...block.content, url: e.target.value })}
                      />
                      <Group>
                        <TextInput
                          size="xs"
                          placeholder="Alt text"
                          value={block.content.alt}
                          onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
                        />
                        <TextInput
                          size="xs"
                          placeholder="Width"
                          value={block.content.width}
                          onChange={(e) => updateBlock(block.id, { ...block.content, width: e.target.value })}
                        />
                      </Group>
                    </Stack>
                  )}
                </Card>
              ))
            )}
          </Stack>
        </Grid.Col>

        {showPreview && (
          <Grid.Col span={6}>
            <Card padding="md" withBorder style={{ position: 'sticky', top: '20px' }}>
              <Text fw={600} mb="md">Preview:</Text>
              <Box style={{ border: '1px solid #e0e0e0', padding: '10px', borderRadius: '5px', maxHeight: '600px', overflow: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: generateHTML() }} />
              </Box>
            </Card>
          </Grid.Col>
        )}
      </Grid>
    </Box>
  );
};

// Create Campaign With Builder Component
const CreateCampaignWithBuilder = ({ newsletters, onCreate }) => {
  const [useBuilder, setUseBuilder] = useState(true);
  const [newsletterId, setNewsletterId] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCampaign = async (e) => {
    e.preventDefault();
    
    if (!newsletterId || !subject.trim() || !contentHtml.trim()) {
      notifications.show({ 
        title: 'Validation Error', 
        message: 'Please fill in all required fields', 
        color: 'red' 
      });
      return;
    }
    
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsletter_id: newsletterId,
          subject,
          content_html: contentHtml,
          content_text: contentText,
          scheduled_for: scheduledFor
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'Campaign created successfully', 
          color: 'green' 
        });
        setNewsletterId('');
        setSubject('');
        setContentHtml('');
        setContentText('');
        setScheduledFor('');
        onCreate();
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={createCampaign}>
      <Stack gap="md">
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={700}>Create New Campaign</Text>
            <Group>
              <Button
                variant={useBuilder ? 'filled' : 'outline'}
                size="xs"
                onClick={() => setUseBuilder(true)}
              >
                🎨 Visual Builder
              </Button>
              <Button
                variant={!useBuilder ? 'filled' : 'outline'}
                size="xs"
                onClick={() => setUseBuilder(false)}
              >
                📝 HTML Editor
              </Button>
            </Group>
          </Group>

          <Stack gap="md">
            <Select
              label="Newsletter"
              data={newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))}
              value={newsletterId}
              onChange={setNewsletterId}
              required
            />
            
            <TextInput
              label="Subject"
              placeholder="Campaign subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />

            {useBuilder ? (
              <EmailBlockBuilder onHtmlGenerated={setContentHtml} />
            ) : (
              <Textarea
                label="HTML Content"
                placeholder="Enter HTML content..."
                minRows={12}
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
                required
              />
            )}
            
            <Textarea
              label="Text Content (Optional)"
              placeholder="Plain text fallback"
              minRows={5}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
            />
            
            <TextInput
              label="Schedule For (Optional)"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              description="Leave empty to create as draft"
            />
            
            <Button type="submit" loading={isSubmitting} fullWidth>
              {scheduledFor ? 'Schedule Campaign' : 'Create Draft'}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </form>
  );
};

// Create Campaign Component (Old - keeping for reference)
const CreateCampaign = ({ newsletters, onCreate }) => {
  const [newsletterId, setNewsletterId] = useState('');
  const [subject, setSubject] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyTemplate = (template) => {
    setContentHtml(template.html_content);
    setContentText(template.text_content);
    setSubject(template.subject);
    notifications.show({ 
      title: 'Mall tillagd', 
      message: `Mallen "${template.name}" har applicerats`, 
      color: 'blue' 
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newsletterId) newErrors.newsletterId = 'Välj ett nyhetsbrev';
    if (!subject.trim()) newErrors.subject = 'Ämne krävs';
    if (!contentHtml.trim()) newErrors.contentHtml = 'HTML-innehåll krävs';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createCampaign = async (e) => {
    e.preventDefault();
    
    // Validera formuläret
    if (!validateForm()) {
      notifications.show({ 
        title: 'Valideringsfel', 
        message: 'Vänligen fyll i alla obligatoriska fält', 
        color: 'red' 
      });
      return;
    }
    
    setIsSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsletter_id: newsletterId,
          subject,
          content_html: contentHtml,
          content_text: contentText,
          scheduled_for: scheduledFor
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'Campaign created successfully', 
          color: 'green' 
        });
        setNewsletterId('');
        setSubject('');
        setContentHtml('');
        setContentText('');
        setScheduledFor('');
        setErrors({});
        onCreate();
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message || 'Failed to create campaign', 
        color: 'red' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid>
      <Grid.Col span={12} md={7}>
        <Stack gap="md">
          {/* Email Templates */}
          <EmailTemplates onApplyTemplate={applyTemplate} />
          
          <Card padding="lg">
            <Text size="lg" fw={700} mb="md">Create New Campaign</Text>
            
            <form onSubmit={createCampaign}>
            <Stack gap="md">
              <Select
                label="Newsletter"
                data={newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))}
                value={newsletterId}
                onChange={(value) => {
                  setNewsletterId(value);
                  setErrors(prev => ({ ...prev, newsletterId: '' }));
                }}
                error={errors.newsletterId}
                required
              />
              
              <TextInput
                label="Subject"
                placeholder="Campaign subject line"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setErrors(prev => ({ ...prev, subject: '' }));
                }}
                error={errors.subject}
                required
              />
              
              <Box>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>HTML Content</Text>
                  <Button 
                    size="xs" 
                    variant="light" 
                    onClick={() => setShowHelp(!showHelp)}
                  >
                    {showHelp ? 'Hide' : 'Show'} Examples
                  </Button>
                </Group>
                <Textarea
                  placeholder="Enter HTML content for your newsletter"
                  minRows={12}
                  maxRows={50}
                  autosize
                  value={contentHtml}
                  onChange={(e) => {
                    setContentHtml(e.target.value);
                    setErrors(prev => ({ ...prev, contentHtml: '' }));
                  }}
                  error={errors.contentHtml}
                  styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
                />
              </Box>
          
              <Textarea
                label="Text Content"
                placeholder="Enter plain text content (fallback)"
                minRows={5}
                maxRows={30}
                autosize
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
              />
              
              <TextInput
                label="Schedule For (Optional)"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                description="Lämna tomt för att skapa som utkast. Fyll i för att schemalägga."
              />
              
              <Group>
                <Button type="submit" loading={isSubmitting} style={{ flex: 1 }}>
                  {scheduledFor ? 'Schemalägga Kampanj' : 'Skapa Utkast'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
        </Stack>
      </Grid.Col>
      
      <Grid.Col span={12} md={5}>
        {showHelp && (
          <Card padding="lg" withBorder>
            <Text fw={700} mb="md">📝 HTML Examples</Text>
            
            <Stack gap="lg">
              <Box>
                <Text fw={600} size="sm" mb="xs">🔗 Länkar:</Text>
                <Code block>{`<a href="https://boulefront.se">Besök vår hemsida</a>`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">🖼️ Bilder:</Text>
                <Code block>{`<img src="https://example.com/bild.jpg" alt="Beskrivning" style="max-width: 100%; height: auto;">`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">📋 Rubriker:</Text>
                <Code block>{`<h1>Stor rubrik</h1>
<h2>Mindre rubrik</h2>
<h3>Ännu mindre</h3>`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">📝 Text:</Text>
                <Code block>{`<p>Vanlig text</p>
<p><strong>Fet text</strong></p>
<p><em>Kursiv text</em></p>`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">📌 Listor:</Text>
                <Code block>{`<ul>
  <li>Punkt 1</li>
  <li>Punkt 2</li>
</ul>`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">🎨 Knapp:</Text>
                <Code block>{`<a href="https://boulefront.se" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Klicka här</a>`}</Code>
              </Box>
              
              <Box>
                <Text fw={600} size="sm" mb="xs">✨ Komplett exempel:</Text>
                <Code block>{`<h1>Välkommen!</h1>
<p>Hej {{name}},</p>
<img src="https://example.com/banner.jpg" alt="Banner" style="max-width: 100%;">
<p>Här är våra senaste nyheter:</p>
<ul>
  <li>Nyhet 1</li>
  <li>Nyhet 2</li>
</ul>
<a href="https://boulefront.se" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Läs mer</a>`}</Code>
              </Box>
            </Stack>
          </Card>
        )}
      </Grid.Col>
    </Grid>
  );
};

// SMS Campaigns Component
const SMSCampaigns = ({ newsletters }) => {
  const [smsCampaigns, setSmsCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newsletterId, setNewsletterId] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    fetchSMSCampaigns();
  }, []);

  const fetchSMSCampaigns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/sms-campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch SMS campaigns');
      const data = await response.json();
      setSmsCampaigns(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createSMSCampaign = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/sms-campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsletter_id: newsletterId,
          message,
          scheduled_for: scheduledFor
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'SMS campaign created successfully', 
          color: 'green' 
        });
        setShowCreateModal(false);
        setNewsletterId('');
        setMessage('');
        setScheduledFor('');
        fetchSMSCampaigns();
      } else {
        throw new Error('Failed to create SMS campaign');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    }
  };

  const sendSMSCampaign = async (campaignId) => {
    setSendingId(campaignId);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/sms-campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to send SMS campaign');
      const data = await response.json();
      notifications.show({ 
        title: 'SMS Campaign Sent', 
        message: data.message, 
        color: 'green' 
      });
      fetchSMSCampaigns();
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message || 'Failed to send SMS campaign', 
        color: 'red' 
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={700}>📱 SMS-kampanjer</Text>
          <Button onClick={() => setShowCreateModal(true)}>
            Skapa SMS-kampanj
          </Button>
        </Group>

        {loading ? (
          <LoadingOverlay visible />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Newsletter</th>
                <th>Message</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {smsCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    <Text c="dimmed">Inga SMS-kampanjer än. Skapa din första!</Text>
                  </td>
                </tr>
              ) : (
                smsCampaigns.map(campaign => (
                  <tr key={campaign.id}>
                    <td>{campaign.newsletter_name}</td>
                    <td style={{ maxWidth: '300px' }}>
                      <Text lineClamp={2}>{campaign.message}</Text>
                    </td>
                    <td>
                      <Badge color={campaign.status === 'sent' ? 'green' : 'blue'}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td>{new Date(campaign.created_at).toLocaleDateString()}</td>
                    <td>
                      {campaign.status === 'draft' && (
                        <Button 
                          size="xs" 
                          onClick={() => sendSMSCampaign(campaign.id)}
                          loading={sendingId === campaign.id}
                        >
                          Send
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        <Card padding="lg" withBorder>
          <Text fw={700} mb="md">💡 Om SMS-kampanjer</Text>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              • SMS-meddelanden är begränsade till 160 tecken
            </Text>
            <Text size="sm" c="dimmed">
              • Prenumeranter behöver ha ett telefonnummer för att ta emot SMS
            </Text>
            <Text size="sm" c="dimmed">
              • Konfigurera Twilio i din .env-fil för att aktivera SMS-utskick
            </Text>
            <Text size="sm" c="dimmed">
              • SMS-kampanjer skickas till alla bekräftade prenumeranter med telefonnummer
            </Text>
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Skapa SMS-kampanj"
        size="lg"
      >
        <form onSubmit={createSMSCampaign}>
          <Stack gap="md">
            <Select
              label="Nyhetsbrev"
              data={newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))}
              value={newsletterId}
              onChange={setNewsletterId}
              required
            />
            
            <Textarea
              label="Meddelande"
              placeholder="Ditt SMS-meddelande (max 160 tecken)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
              minRows={3}
              required
              description={`${message.length}/160 tecken`}
            />
            
            <TextInput
              label="Schemalägg (valfritt)"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              description="Lämna tomt för att skapa som utkast"
            />
            
            <Group justify="flex-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Avbryt
              </Button>
              <Button type="submit">
                {scheduledFor ? 'Schemalägg SMS' : 'Skapa Utkast'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};

// Landing Pages Component
const LandingPages = ({ newsletters }) => {
  const [landingPages, setLandingPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageStats, setPageStats] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [newsletterId, setNewsletterId] = useState('');

  useEffect(() => {
    fetchLandingPages();
  }, []);

  const fetchLandingPages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/landing-pages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch landing pages');
      const data = await response.json();
      setLandingPages(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createLandingPage = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/landing-pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          content_html: contentHtml,
          newsletter_id: newsletterId
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'Landing page created successfully', 
          color: 'green' 
        });
        setShowCreateModal(false);
        resetForm();
        fetchLandingPages();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create landing page');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    }
  };

  const togglePublish = async (page) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/landing-pages/${page.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...page,
          is_published: page.is_published ? 0 : 1
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: `Landing page ${page.is_published ? 'unpublished' : 'published'}`, 
          color: 'green' 
        });
        fetchLandingPages();
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: 'Failed to update landing page', 
        color: 'red' 
      });
    }
  };

  const viewStats = async (page) => {
    setSelectedPage(page);
    setShowStatsModal(true);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/landing-pages/${page.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPageStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setContentHtml('');
    setNewsletterId('');
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={700}>🎯 Landningssidor</Text>
          <Button onClick={() => setShowCreateModal(true)}>
            Skapa Landningssida
          </Button>
        </Group>

        {loading ? (
          <LoadingOverlay visible />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Newsletter</th>
                <th>Status</th>
                <th>Views</th>
                <th>Conversions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {landingPages.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    <Text c="dimmed">No landing pages yet. Create your first one!</Text>
                  </td>
                </tr>
              ) : (
                landingPages.map(page => (
                  <tr key={page.id}>
                    <td>{page.title}</td>
                    <td>
                      <Code>{page.slug}</Code>
                    </td>
                    <td>{page.newsletter_name || '-'}</td>
                    <td>
                      <Badge color={page.is_published ? 'green' : 'gray'}>
                        {page.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td>{page.views}</td>
                    <td>{page.conversions}</td>
                    <td>
                      <Group gap="xs">
                        <Button 
                          size="xs" 
                          variant="light"
                          onClick={() => togglePublish(page)}
                        >
                          {page.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button 
                          size="xs" 
                          variant="outline"
                          onClick={() => viewStats(page)}
                        >
                          Stats
                        </Button>
                      </Group>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        <Card padding="lg" withBorder>
          <Text fw={700} mb="md">💡 Om Landningssidor</Text>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              • Skapa anpassade landningssidor för att fånga leads
            </Text>
            <Text size="sm" c="dimmed">
              • Länka till ett nyhetsbrev för att automatiskt lägga till prenumeranter
            </Text>
            <Text size="sm" c="dimmed">
              • Spåra visningar och konverteringar i realtid
            </Text>
            <Text size="sm" c="dimmed">
              • Publicerade sidor finns på: http://localhost:3000/api/landing-pages/[slug]
            </Text>
          </Stack>
        </Card>
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Landing Page"
        size="xl"
      >
        <form onSubmit={createLandingPage}>
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="My Awesome Landing Page"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(generateSlug(e.target.value));
              }}
              required
            />
            
            <TextInput
              label="Slug (URL)"
              placeholder="my-awesome-page"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              description="This will be used in the URL"
              required
            />

            <Textarea
              label="Description"
              placeholder="A brief description of this landing page"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={2}
            />
            
            <Select
              label="Link to Newsletter (Optional)"
              placeholder="Select a newsletter"
              data={[
                { value: '', label: 'None' },
                ...newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))
              ]}
              value={newsletterId}
              onChange={setNewsletterId}
              description="Submissions will automatically subscribe to this newsletter"
            />

            <Textarea
              label="HTML Content"
              placeholder="Enter your landing page HTML..."
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              minRows={10}
              maxRows={30}
              autosize
              required
              styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
            />
            
            <Group justify="flex-end">
              <Button variant="outline" onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                Create Landing Page
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal
        opened={showStatsModal}
        onClose={() => {
          setShowStatsModal(false);
          setSelectedPage(null);
          setPageStats(null);
        }}
        title={`Stats: ${selectedPage?.title}`}
        size="lg"
      >
        {pageStats ? (
          <Stack gap="md">
            <SimpleGrid cols={3}>
              <Box>
                <Text size="xl" fw={700} c="blue">{pageStats.views}</Text>
                <Text size="sm" c="dimmed">Views</Text>
              </Box>
              <Box>
                <Text size="xl" fw={700} c="green">{pageStats.conversions}</Text>
                <Text size="sm" c="dimmed">Conversions</Text>
              </Box>
              <Box>
                <Text size="xl" fw={700} c="orange">{pageStats.conversion_rate}%</Text>
                <Text size="sm" c="dimmed">Conversion Rate</Text>
              </Box>
            </SimpleGrid>

            <Box>
              <Text fw={700} mb="md">Recent Submissions</Text>
              {pageStats.submissions && pageStats.submissions.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStats.submissions.slice(0, 10).map((sub, idx) => (
                      <tr key={idx}>
                        <td>{sub.email}</td>
                        <td>{sub.name || '-'}</td>
                        <td>{new Date(sub.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Text c="dimmed">No submissions yet</Text>
              )}
            </Box>
          </Stack>
        ) : (
          <LoadingOverlay visible />
        )}
      </Modal>
    </>
  );
};

// Surveys Component
const Surveys = ({ newsletters }) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyResults, setSurveyResults] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newsletterId, setNewsletterId] = useState('');
  const [questions, setQuestions] = useState([
    { id: 1, question: '', type: 'text' }
  ]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/surveys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Kunde inte hämta enkäter');
      const data = await response.json();
      setSurveys(data);
    } catch (error) {
      notifications.show({ 
        title: 'Fel', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createSurvey = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          questions,
          newsletter_id: newsletterId
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Klart!', 
          message: 'Enkät skapad', 
          color: 'green' 
        });
        setShowCreateModal(false);
        resetForm();
        fetchSurveys();
      } else {
        throw new Error('Kunde inte skapa enkät');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Fel', 
        message: error.message, 
        color: 'red' 
      });
    }
  };

  const viewResults = async (survey) => {
    setSelectedSurvey(survey);
    setShowResultsModal(true);
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/surveys/${survey.id}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSurveyResults(data);
    } catch (error) {
      console.error('Kunde inte hämta resultat:', error);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now(), question: '', type: 'text' }]);
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setNewsletterId('');
    setQuestions([{ id: 1, question: '', type: 'text' }]);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={700}>📋 Enkäter</Text>
          <Button onClick={() => setShowCreateModal(true)}>
            Skapa Enkät
          </Button>
        </Group>

        {loading ? (
          <LoadingOverlay visible />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Titel</th>
                <th>Nyhetsbrev</th>
                <th>Frågor</th>
                <th>Svar</th>
                <th>Status</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {surveys.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                    <Text c="dimmed">Inga enkäter än. Skapa din första!</Text>
                  </td>
                </tr>
              ) : (
                surveys.map(survey => (
                  <tr key={survey.id}>
                    <td>{survey.title}</td>
                    <td>{survey.newsletter_name || 'Alla'}</td>
                    <td>{JSON.parse(survey.questions || '[]').length} st</td>
                    <td>{survey.response_count || 0} st</td>
                    <td>
                      <Badge color={survey.is_active ? 'green' : 'gray'}>
                        {survey.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </td>
                    <td>
                      <Button 
                        size="xs" 
                        variant="light"
                        onClick={() => viewResults(survey)}
                      >
                        Se Resultat
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        <Card padding="lg" withBorder>
          <Text fw={700} mb="md">💡 Om Enkäter</Text>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              • Skapa enkäter för att samla feedback från användare
            </Text>
            <Text size="sm" c="dimmed">
              • Länka till ett nyhetsbrev för automatisk prenumeration
            </Text>
            <Text size="sm" c="dimmed">
              • Se alla svar och statistik i realtid
            </Text>
          </Stack>
        </Card>
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Skapa Enkät"
        size="lg"
      >
        <form onSubmit={createSurvey}>
          <Stack gap="md">
            <TextInput
              label="Titel"
              placeholder="Kundnöjdhetsenkät"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            
            <Textarea
              label="Beskrivning"
              placeholder="En kort beskrivning av enkäten"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={2}
            />

            <Select
              label="Nyhetsbrev (valfritt)"
              placeholder="Välj nyhetsbrev"
              data={[
                { value: '', label: 'Inget nyhetsbrev' },
                ...newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))
              ]}
              value={newsletterId}
              onChange={setNewsletterId}
            />

            <Box>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Frågor</Text>
                <Button size="xs" variant="light" onClick={addQuestion}>
                  + Lägg till Fråga
                </Button>
              </Group>

              {questions.map((q, index) => (
                <Card key={q.id} padding="md" withBorder mb="sm">
                  <Group justify="space-between" mb="xs">
                    <Badge>Fråga {index + 1}</Badge>
                    {questions.length > 1 && (
                      <Button 
                        size="xs" 
                        color="red" 
                        variant="subtle"
                        onClick={() => removeQuestion(q.id)}
                      >
                        Ta bort
                      </Button>
                    )}
                  </Group>
                  <TextInput
                    placeholder="Din fråga här..."
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                    required
                  />
                </Card>
              ))}
            </Box>
            
            <Group justify="flex-end">
              <Button variant="outline" onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}>
                Avbryt
              </Button>
              <Button type="submit">
                Skapa Enkät
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Results Modal */}
      <Modal
        opened={showResultsModal}
        onClose={() => {
          setShowResultsModal(false);
          setSelectedSurvey(null);
          setSurveyResults(null);
        }}
        title={`Resultat: ${selectedSurvey?.title}`}
        size="lg"
      >
        {surveyResults ? (
          <Stack gap="md">
            <Box>
              <Text size="xl" fw={700} c="blue">{surveyResults.total_responses}</Text>
              <Text size="sm" c="dimmed">Totalt antal svar</Text>
            </Box>

            {surveyResults.responses && surveyResults.responses.length > 0 ? (
              <Box>
                <Text fw={700} mb="md">Senaste svaren:</Text>
                <Stack gap="sm">
                  {surveyResults.responses.slice(0, 10).map((response, idx) => (
                    <Card key={idx} padding="sm" withBorder>
                      <Text size="sm" fw={600}>{response.email || response.name || 'Anonym'}</Text>
                      <Text size="xs" c="dimmed">{new Date(response.created_at).toLocaleString()}</Text>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Text c="dimmed">Inga svar än</Text>
            )}
          </Stack>
        ) : (
          <LoadingOverlay visible />
        )}
      </Modal>
    </>
  );
};

// Automation Flows Component
const AutomationFlows = ({ newsletters }) => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('new_subscriber');
  const [newsletterId, setNewsletterId] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState([
    { step: 1, type: 'email', delay_days: 0, subject: '', content: '' }
  ]);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/automation-flows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch automation flows');
      const data = await response.json();
      setFlows(data);
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/automation-flows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          trigger_event: triggerEvent,
          workflow_steps: workflowSteps,
          newsletter_id: newsletterId
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'Automation flow created successfully', 
          color: 'green' 
        });
        setShowCreateModal(false);
        resetForm();
        fetchFlows();
      } else {
        throw new Error('Failed to create automation flow');
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: error.message, 
        color: 'red' 
      });
    }
  };

  const toggleActive = async (flow) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/automation-flows/${flow.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...flow,
          is_active: flow.is_active ? 0 : 1
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: `Flow ${flow.is_active ? 'deactivated' : 'activated'}`, 
          color: 'green' 
        });
        fetchFlows();
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: 'Failed to update flow', 
        color: 'red' 
      });
    }
  };

  const addStep = () => {
    setWorkflowSteps([
      ...workflowSteps,
      { 
        step: workflowSteps.length + 1, 
        type: 'email', 
        delay_days: 1, 
        subject: '', 
        content: '' 
      }
    ]);
  };

  const removeStep = (index) => {
    const newSteps = workflowSteps.filter((_, i) => i !== index);
    // Renumber steps
    const renumbered = newSteps.map((step, i) => ({ ...step, step: i + 1 }));
    setWorkflowSteps(renumbered);
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...workflowSteps];
    newSteps[index][field] = value;
    setWorkflowSteps(newSteps);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerEvent('new_subscriber');
    setNewsletterId('');
    setWorkflowSteps([
      { step: 1, type: 'email', delay_days: 0, subject: '', content: '' }
    ]);
  };

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="lg" fw={700}>⚡ Automationsflöden</Text>
          <Button onClick={() => setShowCreateModal(true)}>
            Skapa Automationsflöde
          </Button>
        </Group>

        {loading ? (
          <LoadingOverlay visible />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger</th>
                <th>Steps</th>
                <th>Newsletter</th>
                <th>Active Subscribers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    <Text c="dimmed">No automation flows yet. Create your first one!</Text>
                  </td>
                </tr>
              ) : (
                flows.map(flow => (
                  <tr key={flow.id}>
                    <td>{flow.name}</td>
                    <td>
                      <Badge variant="light">
                        {flow.trigger_event.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td>{flow.workflow_steps?.length || 0} steps</td>
                    <td>{flow.newsletter_name || 'All'}</td>
                    <td>{flow.active_subscribers || 0}</td>
                    <td>
                      <Badge color={flow.is_active ? 'green' : 'gray'}>
                        {flow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Group gap="xs">
                        <Button 
                          size="xs" 
                          variant="light"
                          onClick={() => {
                            setSelectedFlow(flow);
                            setShowViewModal(true);
                          }}
                        >
                          View
                        </Button>
                        <Button 
                          size="xs" 
                          variant="outline"
                          onClick={() => toggleActive(flow)}
                        >
                          {flow.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Group>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        <Card padding="lg" withBorder>
          <Text fw={700} mb="md">💡 Om Automationsflöden</Text>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              • Skapa automatiserade e-postsekvenser som triggas av händelser
            </Text>
            <Text size="sm" c="dimmed">
              • Ställ in fördröjningar mellan e-postmeddelanden (t.ex. skicka efter 3 dagar)
            </Text>
            <Text size="sm" c="dimmed">
              • Spåra prenumeranter genom varje steg i flödet
            </Text>
            <Text size="sm" c="dimmed">
              • Tillgängliga triggers: Ny Prenumerant, Enkät Slutförd, Landningssida Inskickad
            </Text>
          </Stack>
        </Card>
      </Stack>

      {/* Create Modal */}
      <Modal
        opened={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Skapa Automationsflöde"
        size="xl"
      >
        <form onSubmit={createFlow}>
          <Stack gap="md">
            <TextInput
              label="Flödesnamn"
              placeholder="Välkomstserie"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            
            <Textarea
              label="Beskrivning"
              placeholder="En kort beskrivning av detta automationsflöde"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minRows={2}
            />

            <Select
              label="Trigger-händelse"
              data={[
                { value: 'new_subscriber', label: 'Ny Prenumerant' },
                { value: 'survey_completed', label: 'Enkät Slutförd' },
                { value: 'landing_page_submit', label: 'Landningssida Inskickad' }
              ]}
              value={triggerEvent}
              onChange={setTriggerEvent}
              required
            />
            
            <Select
              label="Nyhetsbrev (valfritt)"
              placeholder="Alla nyhetsbrev"
              data={[
                { value: '', label: 'Alla Nyhetsbrev' },
                ...newsletters.map(nl => ({ value: nl.id.toString(), label: nl.name }))
              ]}
              value={newsletterId}
              onChange={setNewsletterId}
            />

            <Box>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Flödessteg</Text>
                <Button size="xs" variant="light" onClick={addStep}>
                  + Lägg till Steg
                </Button>
              </Group>

              {workflowSteps.map((step, index) => (
                <Card key={index} padding="md" withBorder mb="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Badge>Step {step.step}</Badge>
                      {workflowSteps.length > 1 && (
                        <Button 
                          size="xs" 
                          color="red" 
                          variant="subtle"
                          onClick={() => removeStep(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>

                    <TextInput
                      label="Fördröjning (dagar)"
                      type="number"
                      min="0"
                      value={step.delay_days}
                      onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value))}
                      description={step.delay_days === 0 ? 'Skickas omedelbart' : `Skickas ${step.delay_days} dagar efter trigger`}
                    />

                    <TextInput
                      label="E-postämne"
                      placeholder="Välkommen till vårt nyhetsbrev!"
                      value={step.subject}
                      onChange={(e) => updateStep(index, 'subject', e.target.value)}
                      required
                    />

                    <Textarea
                      label="E-postinnehåll"
                      placeholder="E-postinnehåll..."
                      value={step.content}
                      onChange={(e) => updateStep(index, 'content', e.target.value)}
                      minRows={3}
                      required
                    />
                  </Stack>
                </Card>
              ))}
            </Box>
            
            <Group justify="flex-end">
              <Button variant="outline" onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}>
                Avbryt
              </Button>
              <Button type="submit">
                Skapa Flöde
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        opened={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedFlow(null);
        }}
        title={`Flöde: ${selectedFlow?.name}`}
        size="lg"
      >
        {selectedFlow && (
          <Stack gap="md">
            <Box>
              <Text fw={700} mb="xs">Beskrivning:</Text>
              <Text c="dimmed">{selectedFlow.description || 'Ingen beskrivning'}</Text>
            </Box>

            <Box>
              <Text fw={700} mb="xs">Trigger:</Text>
              <Badge variant="light">{selectedFlow.trigger_event.replace('_', ' ')}</Badge>
            </Box>

            <Box>
              <Text fw={700} mb="xs">Flödessteg:</Text>
              {selectedFlow.workflow_steps && selectedFlow.workflow_steps.length > 0 ? (
                <Stack gap="sm">
                  {selectedFlow.workflow_steps.map((step, idx) => (
                    <Card key={idx} padding="md" withBorder>
                      <Group justify="space-between" mb="xs">
                        <Badge>Step {step.step}</Badge>
                        <Text size="sm" c="dimmed">
                          {step.delay_days === 0 ? 'Omedelbart' : `Efter ${step.delay_days} dagar`}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm">{step.subject}</Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>{step.content}</Text>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">Inga steg konfigurerade</Text>
              )}
            </Box>
          </Stack>
        )}
      </Modal>
    </>
  );
};

// Subscriber Form Component
const SubscriberForm = ({ newsletters }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newsletterSlugs, setNewsletterSlugs] = useState([]);

  const addSubscriber = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone_number: phoneNumber,
          newsletter_slugs: newsletterSlugs
        })
      });
      
      if (response.ok) {
        notifications.show({ 
          title: 'Success', 
          message: 'Subscriber added successfully', 
          color: 'green' 
        });
        setEmail('');
        setName('');
        setPhoneNumber('');
        setNewsletterSlugs([]);
      }
    } catch (error) {
      notifications.show({ 
        title: 'Error', 
        message: 'Failed to add subscriber', 
        color: 'red' 
      });
    }
  };

  return (
    <Card style={{ maxWidth: 500 }} padding="lg">
      <Text size="lg" fw={700} mb="md">Add New Subscriber</Text>
      
      <form onSubmit={addSubscriber}>
        <Stack gap="md">
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextInput
            label="Phone Number (optional, for SMS)"
            type="tel"
            placeholder="+46701234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            description="Include country code, e.g. +46 for Sweden"
          />
          
          <MultiSelect
            label="Newsletters"
            data={newsletters.map(nl => ({ value: nl.slug, label: nl.name }))}
            value={newsletterSlugs}
            onChange={setNewsletterSlugs}
          />
          
          <Button type="submit">
            Add Subscriber
          </Button>
        </Stack>
      </form>
    </Card>
  );
};

export default NewsletterEngine;
