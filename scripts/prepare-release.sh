#!/usr/bin/env sh

CURRENT_VERSION="v$(cat package.json | jq -r '.version')"

echo "The current version for LocalChat is $CURRENT_VERSION."
echo ""
echo "Which version should be updated to? Please provide in the format X.Y.Z"
echo "DO NOT ADD THE v IN FRONT OF THE VERSION STRING!"

read NEW_VERSION

echo "Will bump the version for LocalChat to v$NEW_VERSION. Continue?"

# Give the user a last chance to redo if something went wrong
select yn in "Continue" "Abort"; do
  case $yn in
    Continue ) break;;
    Abort ) echo "Aborting process."; exit;;
  esac
done

echo "Bumping version in package.json ..."
echo "$(jq ".version = \"$NEW_VERSION\"" package.json)" > package.json
echo "Committing changes..."
git add package.json
git commit -m "chore: Bump version to v$NEW_VERSION"
git push
echo "Tagging commit ..."
git tag -a "v$NEW_VERSION" -m "Release version v$NEW_VERSION"
git push origin $NEW_VERSION
echo "Done."
