import { ModelDescriptor } from 'src/main/ModelManager'

/**
 * Takes a model descriptor and returns the most human-readable name possible.
 *
 * @param   {ModelDescriptor}  model  The model descriptor
 *
 * @return  {string}                  The model's name
 */
export function getModelName (model: ModelDescriptor): string {
  if (model.metadata?.general.name === undefined) {
    return model.name
  } else {
    return model.metadata.general.name
  }
}
