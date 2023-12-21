/**
 * Booster Pack extension
 *
 * @author Mark Croxton, Hallmark Design
 */

import BoosterExt from '../boosterExt.js'
import BoosterFactory from '../boosterFactory.js';
import BoosterConductor from '../boosterConductor.js';

// Load extension
new BoosterExt(BoosterFactory, 'booster');
new BoosterConductor('booster');

