# Health Score Factors - Implementation Status

## Current Health Score Implementation

### How Health Score Works
- **Base Score**: Starts at 100 points
- **Cumulative Penalties**: Each issue ADDS to the penalty (e.g., if you have 3 back-to-back meetings, you lose 3 × 15 = 45 points)
- **Final Score**: Capped between 0-100

### ✅ CURRENTLY IMPLEMENTED FACTORS

These are the factors actually being calculated in the current codebase:

| Factor | Impact | Function | Status | Cumulative |
|--------|--------|----------|---------|------------|
| **Back-to-back meetings** | -15 per occurrence | `countBackToBack()` | ✅ Implemented | Yes - each one counts |
| **Insufficient buffer (<10min)** | -8 per occurrence | `countInsufficientBuffers()` | ✅ Implemented | Yes - each one counts |
| **Focus blocks (60-120min gaps)** | +8 per block | `countFocusBlocks()` | ✅ Implemented | Yes - each one counts |
| **Meeting overload (>6 hours)** | -10 | `calculateTotalMeetingTime()` | ✅ Implemented | One-time penalty |
| **Meeting overload (>8 hours)** | -20 additional | `calculateTotalMeetingTime()` | ✅ Implemented | One-time penalty (cumulative with >6) |

### ⚠️ DETECTED BUT NOT IN HEALTH SCORE

These factors are calculated in analytics but NOT included in the health score calculation:

| Factor | Function | Used In | Why Not In Score |
|--------|----------|---------|------------------|
| **Double bookings** | `detectDoubleBookings()` | Analytics/Workflows | Would be good to add |
| **Missing video links** | `findMeetingsWithoutVideoLinks()` | Analytics/Workflows | Minor issue |
| **Declined meetings present** | `findDeclinedTwoPersonMeetings()` | Analytics/Workflows | Cleanliness issue |
| **Flights without travel blocks** | `findFlightsWithoutTravelBlocks()` | Analytics/Workflows | Travel-specific |
| **International flights without location** | `findInternationalFlightsWithoutLocation()` | Analytics/Workflows | Travel-specific |
| **Out-of-hours meetings** | `findMeetingsOutsideBusinessHours()` | Analytics/Workflows | Would be good to add |

### ❌ NOT IMPLEMENTED AT ALL

These factors were proposed but don't exist in the codebase:

- **No lunch break** - Not implemented
- **Late night meetings (>8pm)** - Partially covered by out-of-hours
- **Early morning meetings (<8am)** - Partially covered by out-of-hours
- **Fragmented schedule** - Not implemented

---

## Proposed Enhancement: Configurable Health Factors

### New Database Table: `health_score_factors`

```sql
CREATE TABLE health_score_factors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Factor identification
    factor_key TEXT NOT NULL UNIQUE,  -- e.g., 'back_to_back', 'double_booking'
    factor_name TEXT NOT NULL,        -- Display name: "Back-to-back meetings"
    description TEXT,                  -- Explanation of what this measures
    category TEXT,                     -- 'scheduling', 'meeting_hygiene', 'travel', 'work_life_balance'

    -- Scoring configuration
    impact_type TEXT NOT NULL,        -- 'per_occurrence' or 'threshold'
    base_impact INTEGER NOT NULL,     -- Points to add/subtract
    threshold_value DECIMAL,          -- For threshold types (e.g., 6 for hours)
    threshold_operator TEXT,          -- 'gt', 'lt', 'gte', 'lte', 'eq'

    -- Control flags
    is_active BOOLEAN DEFAULT true,   -- Whether to include in calculations
    is_positive BOOLEAN DEFAULT false, -- true for bonuses, false for penalties
    applies_cumulative BOOLEAN DEFAULT true, -- Whether multiple occurrences stack

    -- User customization
    allow_user_override BOOLEAN DEFAULT false,  -- Can users customize this?
    min_impact INTEGER,               -- Min value users can set
    max_impact INTEGER,               -- Max value users can set

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-specific overrides
CREATE TABLE user_health_factor_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    factor_id UUID NOT NULL REFERENCES health_score_factors(id),

    -- Override values
    custom_impact INTEGER,            -- User's custom point value
    is_disabled BOOLEAN DEFAULT false, -- User disabled this factor

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, factor_id)
);
```

### Default Factor Configuration

```sql
-- Currently implemented factors
INSERT INTO health_score_factors (factor_key, factor_name, description, category, impact_type, base_impact, is_positive, applies_cumulative) VALUES
('back_to_back', 'Back-to-back meetings', 'Meetings with no buffer between them', 'scheduling', 'per_occurrence', -15, false, true),
('insufficient_buffer', 'Insufficient buffer', 'Less than 10 minutes between meetings', 'scheduling', 'per_occurrence', -8, false, true),
('focus_blocks', 'Focus time blocks', '60-120 minute gaps for deep work', 'scheduling', 'per_occurrence', 8, true, true),
('meeting_overload_6h', 'Meeting overload (6+ hours)', 'More than 6 hours of meetings', 'work_life_balance', 'threshold', -10, false, false),
('meeting_overload_8h', 'Meeting overload (8+ hours)', 'More than 8 hours of meetings', 'work_life_balance', 'threshold', -20, false, false);

-- Factors to add (currently detected but not scored)
INSERT INTO health_score_factors (factor_key, factor_name, description, category, impact_type, base_impact, is_positive, applies_cumulative, is_active) VALUES
('double_booking', 'Double bookings', 'Overlapping meetings', 'scheduling', 'per_occurrence', -25, false, true, false),
('missing_video_links', 'Missing video links', 'Meetings without conference links', 'meeting_hygiene', 'per_occurrence', -3, false, true, false),
('declined_meetings', 'Declined meetings present', 'Declined meetings not removed', 'meeting_hygiene', 'per_occurrence', -5, false, true, false),
('out_of_hours', 'Out-of-hours meetings', 'Meetings outside business hours', 'work_life_balance', 'per_occurrence', -12, false, true, false);
```

---

## Admin Panel Configuration Form

### Admin UI Component (`/src/components/AdminHealthFactors.tsx`)

```typescript
interface HealthFactor {
  id: string;
  factor_key: string;
  factor_name: string;
  description: string;
  category: string;
  impact_type: 'per_occurrence' | 'threshold';
  base_impact: number;
  threshold_value?: number;
  threshold_operator?: string;
  is_active: boolean;
  is_positive: boolean;
  applies_cumulative: boolean;
  allow_user_override: boolean;
}

const AdminHealthFactors: React.FC = () => {
  const [factors, setFactors] = useState<HealthFactor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthFactors();
  }, []);

  const loadHealthFactors = async () => {
    const { data, error } = await supabase
      .from('health_score_factors')
      .select('*')
      .order('category', { ascending: true })
      .order('factor_name', { ascending: true });

    if (data) {
      setFactors(data);
    }
    setLoading(false);
  };

  const updateFactor = async (factorId: string, updates: Partial<HealthFactor>) => {
    const { error } = await supabase
      .from('health_score_factors')
      .update(updates)
      .eq('id', factorId);

    if (!error) {
      await loadHealthFactors();
      toast.success('Health factor updated');
    }
  };

  const toggleFactor = async (factorId: string, isActive: boolean) => {
    await updateFactor(factorId, { is_active: isActive });
  };

  const categories = {
    scheduling: { label: 'Scheduling', color: 'blue', icon: '📅' },
    meeting_hygiene: { label: 'Meeting Hygiene', color: 'green', icon: '✨' },
    work_life_balance: { label: 'Work-Life Balance', color: 'purple', icon: '⚖️' },
    travel: { label: 'Travel', color: 'orange', icon: '✈️' }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Health Score Configuration</h2>
        <p className="text-gray-600">
          Configure how different factors contribute to the calendar health score.
          Base score starts at 100 points.
        </p>
      </div>

      {/* Health Score Preview */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Example Calculation</h3>
            <p className="text-sm text-gray-600 mt-1">
              With 2 back-to-back meetings and 1 focus block:
            </p>
            <p className="text-sm mt-2">
              100 (base) - 30 (2×15 back-to-back) + 8 (1 focus block) = <strong>78</strong>
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">78</div>
            <div className="text-sm text-gray-600">Good Health</div>
          </div>
        </div>
      </div>

      {/* Factors by Category */}
      {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
        const categoryFactors = factors.filter(f => f.category === categoryKey);
        if (categoryFactors.length === 0) return null;

        return (
          <div key={categoryKey} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{categoryInfo.icon}</span>
              <h3 className="font-medium text-gray-900">{categoryInfo.label}</h3>
              <span className="text-xs text-gray-500">
                ({categoryFactors.filter(f => f.is_active).length}/{categoryFactors.length} active)
              </span>
            </div>

            <div className="space-y-2">
              {categoryFactors.map(factor => (
                <div
                  key={factor.id}
                  className={`border rounded-lg p-4 ${
                    factor.is_active ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={factor.is_active}
                          onChange={(checked) => toggleFactor(factor.id, checked)}
                          className={`${
                            factor.is_active ? 'bg-blue-600' : 'bg-gray-200'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                        >
                          <span
                            className={`${
                              factor.is_active ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </Switch>

                        <div className="flex-1">
                          <h4 className={`font-medium ${!factor.is_active && 'text-gray-500'}`}>
                            {factor.factor_name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{factor.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      {/* Impact Configuration */}
                      <div className="text-right">
                        <label className="text-xs text-gray-500 block mb-1">Impact</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={Math.abs(factor.base_impact)}
                            onChange={(e) => updateFactor(factor.id, {
                              base_impact: factor.is_positive
                                ? parseInt(e.target.value)
                                : -parseInt(e.target.value)
                            })}
                            className="w-16 px-2 py-1 border rounded text-center"
                            disabled={!factor.is_active}
                          />
                          <span className={`text-sm font-medium ${
                            factor.is_positive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {factor.is_positive ? '+' : '-'} pts
                          </span>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="text-right">
                        <label className="text-xs text-gray-500 block mb-1">Type</label>
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          factor.impact_type === 'per_occurrence'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {factor.impact_type === 'per_occurrence' ? 'Per Event' : 'Threshold'}
                        </span>
                      </div>

                      {/* Cumulative Badge */}
                      {factor.impact_type === 'per_occurrence' && (
                        <div className="text-right">
                          <label className="text-xs text-gray-500 block mb-1">Stacking</label>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            factor.applies_cumulative
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {factor.applies_cumulative ? 'Stacks' : 'Once'}
                          </span>
                        </div>
                      )}

                      {/* Threshold Configuration */}
                      {factor.impact_type === 'threshold' && factor.threshold_value && (
                        <div className="text-right">
                          <label className="text-xs text-gray-500 block mb-1">Threshold</label>
                          <div className="flex items-center gap-1">
                            <select
                              value={factor.threshold_operator}
                              onChange={(e) => updateFactor(factor.id, {
                                threshold_operator: e.target.value
                              })}
                              className="text-xs border rounded px-1 py-1"
                              disabled={!factor.is_active}
                            >
                              <option value="gt">&gt;</option>
                              <option value="gte">≥</option>
                              <option value="lt">&lt;</option>
                              <option value="lte">≤</option>
                              <option value="eq">=</option>
                            </select>
                            <input
                              type="number"
                              value={factor.threshold_value}
                              onChange={(e) => updateFactor(factor.id, {
                                threshold_value: parseFloat(e.target.value)
                              })}
                              className="w-12 px-1 py-1 border rounded text-center text-sm"
                              disabled={!factor.is_active}
                            />
                          </div>
                        </div>
                      )}

                      {/* User Override Toggle */}
                      <div className="text-right">
                        <label className="text-xs text-gray-500 block mb-1">Users Can Edit</label>
                        <input
                          type="checkbox"
                          checked={factor.allow_user_override}
                          onChange={(e) => updateFactor(factor.id, {
                            allow_user_override: e.target.checked
                          })}
                          className="rounded"
                          disabled={!factor.is_active}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Implementation Status */}
                  {!['back_to_back', 'insufficient_buffer', 'focus_blocks', 'meeting_overload_6h', 'meeting_overload_8h'].includes(factor.factor_key) && (
                    <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⚠️ This factor is detected but not yet included in health score calculations
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add New Factor Button */}
      <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        + Add Custom Factor
      </button>
    </div>
  );
};
```

---

## Updated Health Score Calculation

```typescript
// Enhanced health score calculation with configurable factors
export const calculateHealthScoreWithFactors = async (
  events: CalendarEvent[],
  userId?: string
): Promise<number> => {
  // Get factor configuration
  const factors = await getHealthFactorsForUser(userId);

  let score = 100;

  for (const factor of factors) {
    if (!factor.is_active) continue;

    let impactCount = 0;

    // Calculate occurrences based on factor key
    switch (factor.factor_key) {
      case 'back_to_back':
        impactCount = countBackToBack(events);
        break;
      case 'insufficient_buffer':
        impactCount = countInsufficientBuffers(events);
        break;
      case 'focus_blocks':
        impactCount = countFocusBlocks(events);
        break;
      case 'double_booking':
        impactCount = detectDoubleBookings(events).length;
        break;
      case 'missing_video_links':
        impactCount = findMeetingsWithoutVideoLinks(events).length;
        break;
      case 'declined_meetings':
        impactCount = findDeclinedTwoPersonMeetings(events).length;
        break;
      case 'out_of_hours':
        impactCount = findMeetingsOutsideBusinessHours(events).length;
        break;
      case 'meeting_overload_6h':
        const hours = calculateTotalMeetingTime(events);
        impactCount = hours > 6 ? 1 : 0;
        break;
      case 'meeting_overload_8h':
        const hours8 = calculateTotalMeetingTime(events);
        impactCount = hours8 > 8 ? 1 : 0;
        break;
    }

    // Apply impact
    if (factor.applies_cumulative) {
      score += factor.base_impact * impactCount;
    } else if (impactCount > 0) {
      score += factor.base_impact;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};
```