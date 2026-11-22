import { Hero } from './Hero'
import { RackList } from './RackList'
import { ScenarioPanel } from './ScenarioPanel'
import { TripPanel } from './TripPanel'
/**
 * Overview at `/` (Requirement 24), the page closest to the reference: the
 * hero panel on the left and, offset lower on the right, the scenario panel
 * with rack rows and the trip panel. Below 1440 px the second panel moves
 * under the hero; it lays itself out by its own width (container queries).
 */
export function OverviewPage() {
  return (
    <div className="layout-page py-8">
      <div className="layout-grid items-start">
        <div className="col-span-full wide:col-span-7">
          <Hero />
        </div>
        <section
          aria-label="Drive scenarios and channels"
          data-slot="overview-secondary"
          className="@container col-span-full flex flex-col gap-6 rounded-3 bg-surface-panel p-4 sm:p-6 wide:col-span-5 wide:mt-[136px]"
        >
          <ScenarioPanel />
          <div className="grid gap-6 @min-[44rem]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @min-[44rem]:items-stretch">
            <RackList className="-mx-4 sm:-mx-6 @min-[44rem]:me-0" />
            <TripPanel />
          </div>
        </section>
      </div>
    </div>
  )
}
